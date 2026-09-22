import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import postgres from "postgres";
import type { TransactionSql } from "postgres";
import { z } from "zod";

import {
  approvalDecision,
  approvalRole,
  orgCategory,
  participationType,
  userRole,
} from "../src/db/enums";
import { requireEnv } from "./env";
import { isMain } from "./is-main";

/**
 * Seeds the synthetic demo tenant from the JSON under seed/.
 *
 * Three properties shape everything below, and each of them is forced by a rule
 * rather than chosen for convenience.
 *
 * 1. IT WRITES THROUGH RLS, NOT AROUND IT. Only the school row is created as
 *    `service_role`, because there is no tenant to be inside of yet — the same
 *    reason AdminReason.TENANT_PROVISIONING exists in src/lib/db/admin.ts. Every
 *    other row is inserted as `authenticated` carrying School Admin claims, so a
 *    policy that would refuse the real import refuses the seed too. A seed that
 *    bypassed RLS would run green against a schema that cannot actually serve
 *    the product.
 *
 * 2. IT IS AN UPSERT, NOT A TEARDOWN. `xp_ledger` holds no DELETE grant for any
 *    role and a trigger rejects the attempt even from the table owner (R4), so
 *    "drop the demo school and reseed" is not available and never will be. Every
 *    row therefore carries a UUID derived from a stable key, and re-running is a
 *    replay that changes nothing — which is the same property the offline scan
 *    queue must have (R6), tested here by accident every time you run it twice.
 *
 * 3. IT REFUSES TO RUN NEXT TO REAL DATA. If any school in the database is not
 *    flagged is_demo, this exits before writing. Before Gate B no such row may
 *    exist; after it, this script must never be the thing that touches one.
 *
 * Usage: npm run db:seed:demo
 */

// ---------------------------------------------------------------------------
// Stable identity
// ---------------------------------------------------------------------------

/**
 * A fixed namespace, so `profile:l01` names the same UUID on every machine and
 * in every run. Re-seeding after editing a name updates that learner rather than
 * creating a second one, and a demo URL bookmarked before a pitch still resolves
 * after the data is corrected the morning of it.
 */
const NAMESPACE = Buffer.from("8e2a8f266d5b5b3e9a210c9f5f4b7d10", "hex");

function idFor(key: string): string {
  const digest = createHash("sha1")
    .update(Buffer.concat([NAMESPACE, Buffer.from(key, "utf8")]))
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  // RFC 4122: version 5, variant 10xx.
  bytes.writeUInt8((bytes.readUInt8(6) & 0x0f) | 0x50, 6);
  bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8);
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

// ---------------------------------------------------------------------------
// The seed files, validated at the boundary
// ---------------------------------------------------------------------------

/**
 * A JSON file edited by hand the morning of a pitch is a boundary like any
 * other (R7). Parsing it with Zod turns a mistyped participation type into a
 * named error instead of a Postgres enum violation forty rows into a
 * transaction.
 */

/**
 * The two jsonb columns the seed writes are validated as JSON rather than as
 * "some object", because they are handed to postgres.js as jsonb parameters and
 * it serializes them by type. `z.unknown()` would let a Date or a function
 * through to a serializer that has no answer for either.
 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);
const jsonObject = z.record(z.string(), jsonValue);

const schoolFile = z.object({
  school: z.object({
    slug: z.string(),
    name: z.string(),
    abbreviation: z.string(),
    settings: jsonObject,
  }),
  seasons: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      startsInDays: z.number(),
      endsInDays: z.number(),
      isCurrent: z.boolean(),
    }),
  ),
  levels: z.array(
    z.object({
      levelNumber: z.number(),
      title: z.string(),
      thresholdXp: z.number(),
      badgeKey: z.string(),
    }),
  ),
  xpRules: z.array(
    z.object({
      participationType: z.enum(participationType.enumValues),
      xpValue: z.number(),
    }),
  ),
  announcements: z.array(
    z.object({
      key: z.string(),
      scope: z.enum(["school", "org"]),
      orgKey: z.string().optional(),
      authorKey: z.string(),
      title: z.string(),
      body: z.string(),
      publishInDays: z.number(),
    }),
  ),
});

const personFile = z.object({
  staff: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      schoolRoles: z.array(z.enum(userRole.enumValues)),
    }),
  ),
  learners: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      gradeLevel: z.number(),
      section: z.string(),
      schoolRoles: z.array(z.enum(userRole.enumValues)),
    }),
  ),
  withoutConsent: z.array(z.string()),
});

const orgFile = z.object({
  organizations: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      slug: z.string(),
      category: z.enum(orgCategory.enumValues),
      mission: z.string(),
      advisers: z.array(z.object({ staffKey: z.string(), isPrimary: z.boolean() })),
      officers: z.array(z.object({ learnerKey: z.string(), position: z.string() })),
      members: z.array(z.string()),
      applicants: z.array(z.string()),
    }),
  ),
});

const eventFile = z.object({
  events: z.array(
    z.object({
      key: z.string(),
      orgKey: z.string(),
      title: z.string(),
      description: z.string(),
      venue: z.string(),
      startsInDays: z.number(),
      startsAtHour: z.number(),
      durationHours: z.number(),
      happeningNow: z.boolean().optional(),
      capacity: z.number().optional(),
      status: z.enum(["draft", "pending", "approved", "rejected", "cancelled", "completed"]),
      requiresSslgApproval: z.boolean().optional(),
      eligibility: jsonObject.optional(),
      createdByKey: z.string(),
      approval: z.object({
        role: z.enum(approvalRole.enumValues),
        decision: z.enum(approvalDecision.enumValues).nullable(),
        approverKey: z.string().nullable(),
        reason: z.string().optional(),
      }),
      registrations: z.array(z.string()),
      /**
       * Learners holding a waitlist place, in order. Only meaningful on a
       * capped event that `registrations` already fills — the demo has to be
       * able to show the EVENT_FULL refusal and its offer (US-2), and a
       * waitlist on an event with seats left would be a state the real
       * register path cannot produce.
       */
      waitlisted: z.array(z.string()).optional(),
      /** Learners who gave up a place. Keeps the cancel path visible. */
      cancelled: z.array(z.string()).optional(),
      attendance: z.array(z.string()),
      doubleScanned: z.array(z.string()).optional(),
    }),
  ),
  manualAwards: z.array(
    z.object({
      profileKey: z.string(),
      participationType: z.enum(participationType.enumValues),
      eventKey: z.string().nullable(),
      reason: z.string(),
    }),
  ),
  corrections: z.array(
    z.object({
      eventKey: z.string(),
      profileKey: z.string(),
      reversesScan: z.number(),
      reason: z.string(),
    }),
  ),
});

async function readSeed<T>(name: string, schema: z.ZodType<T>): Promise<T> {
  const raw = await readFile(join(process.cwd(), "seed", name), "utf8");
  const parsed = schema.safeParse(JSON.parse(raw) as unknown);
  if (!parsed.success) {
    throw new Error(`seed/${name} is not valid:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------

/*
 * A jsonb column takes the OBJECT, never a pre-stringified string.
 *
 * postgres.js asks Postgres for the parameter types during Parse and then
 * serializes each value with that type's serializer — and jsonb's serializer is
 * JSON.stringify. Handing it a string it has already stringified stores a jsonb
 * *string* rather than an object, which every `->` and `jsonb_typeof` then reads
 * as absent. That is how the Senior-High-only demo event quietly lost its
 * eligibility rule; `public.register_for_event` now raises on a malformed rule
 * rather than admitting the whole school, which is what caught it.
 */
type SqlValue = string | number | boolean | Date | null | JsonObject;
type Row = Record<string, SqlValue>;

const IDENTIFIER = /^[a-z][a-z0-9_]*$/;

function isJsonObject(value: SqlValue): value is JsonObject {
  return typeof value === "object" && value !== null && !(value instanceof Date);
}

/**
 * Bulk upsert on the primary key.
 *
 * `onConflict: "nothing"` is not an optimisation — it is the only option open on
 * an append-only table, where DO UPDATE would fire the trigger that exists to
 * make history unrewritable.
 */
async function upsert(
  tx: TransactionSql,
  table: string,
  rows: Row[],
  onConflict: "update" | "nothing" = "update",
): Promise<number> {
  if (rows.length === 0) return 0;
  const first = rows[0];
  if (!first) return 0;

  const columns = Object.keys(first);
  for (const name of [table, ...columns]) {
    // These come from this file, never from the seed JSON, but the strings are
    // interpolated rather than bound, so the check is cheap insurance.
    if (!IDENTIFIER.test(name)) throw new Error(`Refusing to interpolate identifier: ${name}`);
  }

  const placeholders = rows
    .map((_, r) => `(${columns.map((_, c) => `$${r * columns.length + c + 1}`).join(", ")})`)
    .join(", ");
  const values = rows.flatMap((row) =>
    columns.map((column) => {
      const value = row[column] ?? null;
      // `tx.json` tags the value so postgres.js serializes it once, as jsonb.
      // Passing a bare object is a type error and passing a pre-stringified one
      // is worse — it type-checks and stores a jsonb string (see SqlValue).
      return isJsonObject(value) ? tx.json(value) : value;
    }),
  );

  const assignments = columns.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`);
  const action =
    onConflict === "nothing" || assignments.length === 0
      ? "do nothing"
      : `do update set ${assignments.join(", ")}`;

  await tx.unsafe(
    `insert into ${table} (${columns.join(", ")}) values ${placeholders} on conflict (id) ${action}`,
    values,
  );
  return rows.length;
}

const DAY_MS = 86_400_000;

function daysFromNow(now: Date, days: number, atHour?: number): Date {
  const date = new Date(now.getTime() + days * DAY_MS);
  if (atHour !== undefined) date.setHours(atHour, 0, 0, 0);
  return date;
}

/**
 * Usernames are derived rather than stored: forty of them are not worth
 * hand-maintaining, and a derived one cannot silently disagree with the display
 * name it is supposed to match. Collisions throw, because a silent second
 * "tala.silangan" is exactly the roster bug the real import has to catch.
 */
function usernameFor(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z ]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
}

// ---------------------------------------------------------------------------
// The seed
// ---------------------------------------------------------------------------

export interface SeedSummary {
  schoolId: string;
  counts: Record<string, number>;
  leaderboard: { name: string; xp: number }[];
}

export async function seedDemo(connectionString: string): Promise<SeedSummary> {
  const [school, people, orgs, events] = await Promise.all([
    readSeed("demo-school.json", schoolFile),
    readSeed("demo-people.json", personFile),
    readSeed("demo-orgs.json", orgFile),
    readSeed("demo-events.json", eventFile),
  ]);

  const sql = postgres(connectionString, { max: 1, onnotice: () => {} });
  const counts: Record<string, number> = {};
  const count = async (table: string, rows: Row[], tx: TransactionSql, mode?: "nothing") => {
    counts[table] = (counts[table] ?? 0) + (await upsert(tx, table, rows, mode ?? "update"));
  };

  try {
    // 1. Refuse to run beside real data. -----------------------------------
    const [real] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM schools WHERE is_demo = false
    `;
    if ((real?.n ?? 0) > 0) {
      throw new Error(
        `Refusing to seed: ${String(real?.n)} school row(s) in this database are not flagged is_demo. ` +
          "The demo seed writes synthetic learners and must never run beside real ones.",
      );
    }

    const now = new Date();
    const schoolId = idFor(`school:${school.school.slug}`);

    // 2. The tenant itself, as service_role. -------------------------------
    // No INSERT policy on `schools` exists for any session, deliberately: there
    // is no tenant to be inside of yet, so there is nothing for a tenancy policy
    // to compare against. This mirrors AdminReason.TENANT_PROVISIONING.
    await sql.begin(async (tx) => {
      await tx`set local role service_role`;
      await count(
        "schools",
        [
          {
            id: schoolId,
            slug: school.school.slug,
            name: school.school.name,
            abbreviation: school.school.abbreviation,
            settings_json: school.school.settings,
            is_demo: true,
          },
        ],
        tx,
      );
    });

    // 3. Everything else, under RLS, as School Admin. ----------------------
    const adminKey = people.staff.find((s) => s.schoolRoles.includes("school_admin"))?.key;
    if (!adminKey) throw new Error("seed/demo-people.json has no staff member holding school_admin.");
    const adminId = idFor(`profile:${adminKey}`);

    // The claims a School Admin session would carry. `has_role` reads the token,
    // never the user_roles table, so the first admin can create the row that
    // records the role it is already asserting — which is how any first-admin
    // bootstrap works, here and in Phase 1.
    const claims = JSON.stringify({
      school_id: schoolId,
      profile_id: adminId,
      roles: ["school_admin"],
      org_grants: [],
    });

    const leaderboard = await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${claims}, true)`;
      await tx`set local role authenticated`;

      // -- people ---------------------------------------------------------
      const profileId = (key: string) => idFor(`profile:${key}`);
      const usernames = new Map<string, string>();
      const everyone = [
        ...people.staff.map((s) => ({ ...s, gradeLevel: null, section: null })),
        ...people.learners,
      ];

      const profileRows: Row[] = everyone.map((person, index) => {
        const username = usernameFor(person.name);
        const clash = usernames.get(username);
        if (clash) throw new Error(`Derived username "${username}" collides: ${clash} and ${person.key}.`);
        usernames.set(username, person.key);
        return {
          id: profileId(person.key),
          school_id: schoolId,
          username,
          display_name: person.name,
          grade_level: person.gradeLevel,
          section: person.section,
          // The curated set only; there are no photo uploads to point at.
          avatar_key: `avatar-${String((index % 16) + 1).padStart(2, "0")}`,
          locale: "en",
          // Two learners are left un-activated because they have no consent row,
          // so the demo can show the gate refusing rather than describing it.
          status: people.withoutConsent.includes(person.key) ? "imported" : "active",
        };
      });
      await count("profiles", profileRows, tx);

      // No profile_identifiers rows. Synthetic learners have no LRN, and the
      // table exists to de-duplicate a real roster import (CLAUDE.md §6). Seeding
      // fake hashes would put a privacy-sensitive shape in the demo for nothing.

      await count(
        "user_roles",
        everyone.flatMap((person) =>
          person.schoolRoles.map((role) => ({
            id: idFor(`role:${person.key}:${role}`),
            school_id: schoolId,
            profile_id: profileId(person.key),
            role,
            org_id: null,
            granted_by: adminId,
          })),
        ),
        tx,
      );

      const consented = people.learners.filter((l) => !people.withoutConsent.includes(l.key));
      await count(
        "consent_records",
        consented.map((learner) => ({
          id: idFor(`consent:${learner.key}`),
          school_id: schoolId,
          profile_id: profileId(learner.key),
          consent_type: "data_processing",
          granted_at: daysFromNow(now, -170),
          recorded_by: adminId,
          // A pointer to a paper form, never a scan of one — and in a demo, a
          // pointer to a form that does not exist and says so.
          reference: `DEMO-CONSENT-NOT-REAL-${learner.key}`,
        })),
        tx,
      );

      // -- organizations --------------------------------------------------
      const orgId = (key: string) => idFor(`org:${key}`);
      const termStart = daysFromNow(now, -180).toISOString().slice(0, 10);

      await count(
        "organizations",
        orgs.organizations.map((org) => ({
          id: orgId(org.key),
          school_id: schoolId,
          name: org.name,
          slug: org.slug,
          category: org.category,
          logo_key: `org-${org.slug}`,
          mission: org.mission,
          status: "active",
        })),
        tx,
      );

      await count(
        "org_advisers",
        orgs.organizations.flatMap((org) =>
          org.advisers.map((adviser) => ({
            id: idFor(`org_adviser:${org.key}:${adviser.staffKey}`),
            school_id: schoolId,
            org_id: orgId(org.key),
            profile_id: profileId(adviser.staffKey),
            is_primary: adviser.isPrimary,
            term_start: termStart,
          })),
        ),
        tx,
      );

      await count(
        "org_officers",
        orgs.organizations.flatMap((org) =>
          org.officers.map((officer) => ({
            id: idFor(`org_officer:${org.key}:${officer.learnerKey}`),
            school_id: schoolId,
            org_id: orgId(org.key),
            profile_id: profileId(officer.learnerKey),
            position: officer.position,
            term_start: termStart,
          })),
        ),
        tx,
      );

      // The org-scoped role rows behind has_org_role(). An officer or adviser
      // whose appointment exists but whose grant does not can see nothing, so
      // these are written from the same lists as the appointments above.
      await count(
        "user_roles",
        orgs.organizations.flatMap((org) => [
          ...org.advisers.map((adviser) => ({
            id: idFor(`role:${adviser.staffKey}:org_adviser:${org.key}`),
            school_id: schoolId,
            profile_id: profileId(adviser.staffKey),
            role: "org_adviser",
            org_id: orgId(org.key),
            granted_by: adminId,
          })),
          ...org.officers.map((officer) => ({
            id: idFor(`role:${officer.learnerKey}:org_officer:${org.key}`),
            school_id: schoolId,
            profile_id: profileId(officer.learnerKey),
            role: "org_officer",
            org_id: orgId(org.key),
            granted_by: adminId,
          })),
        ]),
        tx,
      );

      await count(
        "org_memberships",
        orgs.organizations.flatMap((org) => [
          ...org.members.map((key) => ({
            id: idFor(`membership:${org.key}:${key}`),
            school_id: schoolId,
            org_id: orgId(org.key),
            profile_id: profileId(key),
            status: "active",
            applied_at: daysFromNow(now, -175),
            decided_at: daysFromNow(now, -172),
            decided_by: profileId(org.officers[0]?.learnerKey ?? adminKey),
          })),
          ...org.applicants.map((key) => ({
            id: idFor(`membership:${org.key}:${key}`),
            school_id: schoolId,
            org_id: orgId(org.key),
            profile_id: profileId(key),
            status: "applied",
            applied_at: daysFromNow(now, -4),
            decided_at: null,
            decided_by: null,
          })),
        ]),
        tx,
      );

      // -- seasons, levels, point values ----------------------------------
      const seasonRows = school.seasons.map((season) => ({
        id: idFor(`season:${season.key}`),
        startsOn: daysFromNow(now, season.startsInDays),
        endsOn: daysFromNow(now, season.endsInDays),
        isCurrent: season.isCurrent,
        name: season.name,
      }));
      await count(
        "seasons",
        seasonRows.map((season) => ({
          id: season.id,
          school_id: schoolId,
          name: season.name,
          starts_on: season.startsOn.toISOString().slice(0, 10),
          ends_on: season.endsOn.toISOString().slice(0, 10),
          is_current: season.isCurrent,
        })),
        tx,
      );

      const currentSeason = seasonRows.find((season) => season.isCurrent) ?? seasonRows[0];
      if (!currentSeason) throw new Error("seed/demo-school.json declares no seasons.");
      // An award that falls between seasons belongs to the current one rather
      // than to none: a ledger row with a null season disappears from every
      // seasonal board without ever being wrong enough to notice.
      const seasonFor = (at: Date): string =>
        seasonRows.find((season) => at >= season.startsOn && at <= season.endsOn)?.id ??
        currentSeason.id;

      await count(
        "levels",
        school.levels.map((level) => ({
          id: idFor(`level:${String(level.levelNumber)}`),
          school_id: schoolId,
          level_number: level.levelNumber,
          threshold_xp: level.thresholdXp,
          title: level.title,
          badge_key: level.badgeKey,
        })),
        tx,
      );

      // xp_rules holds no UPDATE grant for anyone: a point value is versioned,
      // never edited, so a past award can always be explained by the rule that
      // was in force when it was made. That makes the usual upsert illegal, and
      // it makes "change the number in the JSON" a two-step operation — insert
      // the baseline, then add a new version wherever the seed file now disagrees
      // with what is in force. Without the second step a retuned demo economy
      // would silently keep the old numbers, which is the one way a seed can lie.
      const xpFor = new Map(school.xpRules.map((rule) => [rule.participationType, rule.xpValue]));
      await count(
        "xp_rules",
        school.xpRules.map((rule) => ({
          id: idFor(`xp_rule:${rule.participationType}`),
          school_id: schoolId,
          participation_type: rule.participationType,
          xp_value: rule.xpValue,
          effective_from: daysFromNow(now, -180),
          created_by: adminId,
        })),
        tx,
        "nothing",
      );

      const inForce = await tx<{ participation_type: string; xp_value: number }[]>`
        SELECT DISTINCT ON (participation_type) participation_type, xp_value
        FROM xp_rules
        ORDER BY participation_type, effective_from DESC
      `;
      const currentValue = new Map(inForce.map((r) => [r.participation_type, r.xp_value]));
      await count(
        "xp_rules",
        school.xpRules
          .filter((rule) => currentValue.get(rule.participationType) !== rule.xpValue)
          .map((rule) => ({
            id: idFor(`xp_rule:${rule.participationType}:${String(rule.xpValue)}`),
            school_id: schoolId,
            participation_type: rule.participationType,
            xp_value: rule.xpValue,
            effective_from: now,
            created_by: adminId,
          })),
        tx,
        "nothing",
      );

      // -- events ---------------------------------------------------------
      const eventId = (key: string) => idFor(`event:${key}`);
      const startOf = new Map<string, Date>();
      const endOf = new Map<string, Date>();

      const eventRows: Row[] = events.events.map((event) => {
        const starts = event.happeningNow
          ? new Date(now.getTime() - 3_600_000)
          : daysFromNow(now, event.startsInDays, event.startsAtHour);
        const ends = new Date(starts.getTime() + event.durationHours * 3_600_000);
        startOf.set(event.key, starts);
        endOf.set(event.key, ends);

        const published = ["approved", "completed", "cancelled"].includes(event.status);
        return {
          id: eventId(event.key),
          school_id: schoolId,
          org_id: orgId(event.orgKey),
          title: event.title,
          description: event.description,
          starts_at: starts,
          ends_at: ends,
          venue: event.venue,
          capacity: event.capacity ?? null,
          eligibility_json: event.eligibility ?? {},
          status: event.status,
          requires_sslg_approval: event.requiresSslgApproval ?? false,
          publish_at: published ? new Date(starts.getTime() - 7 * DAY_MS) : null,
          created_by: profileId(event.createdByKey),
        };
      });
      await count("events", eventRows, tx);

      await count(
        "event_approvals",
        events.events.map((event) => {
          const decided = event.approval.decision !== null;
          return {
            id: idFor(`approval:${event.key}:${event.approval.role}`),
            school_id: schoolId,
            event_id: eventId(event.key),
            approver_id: event.approval.approverKey ? profileId(event.approval.approverKey) : null,
            role: event.approval.role,
            decision: event.approval.decision,
            reason: event.approval.reason ?? null,
            decided_at: decided
              ? new Date((startOf.get(event.key) ?? now).getTime() - 8 * DAY_MS)
              : null,
          };
        }),
        tx,
      );

      /*
       * Registrations, in the three states the register path can leave behind.
       *
       * The seed is checked against the rules public.register_for_event
       * enforces rather than merely being plausible: a demo tenant that holds a
       * state the real endpoint cannot produce is a demo that teaches the wrong
       * thing, and it is the kind of error that surfaces in front of a teacher.
       */
      for (const event of events.events) {
        const waitlisted = event.waitlisted ?? [];
        if (event.capacity !== undefined && event.registrations.length > event.capacity) {
          throw new Error(
            `seed/demo-events.json: ${event.key} registers ${String(event.registrations.length)} into ${String(event.capacity)} seats.`,
          );
        }
        if (waitlisted.length > 0 && event.registrations.length !== event.capacity) {
          throw new Error(
            `seed/demo-events.json: ${event.key} has a waitlist but is not full. A waitlist place is only reachable once capacity is taken.`,
          );
        }
      }

      const registrationRows: Row[] = events.events.flatMap((event) => {
        const startsAt = startOf.get(event.key) ?? now;
        const registeredAt = new Date(startsAt.getTime() - 5 * DAY_MS);

        const seated = event.registrations.map((key) => ({
          id: idFor(`registration:${event.key}:${key}`),
          school_id: schoolId,
          event_id: eventId(event.key),
          profile_id: profileId(key),
          status: "registered",
          waitlist_position: null,
          registered_at: registeredAt,
          cancelled_at: null,
        }));

        // 1-based and contiguous, which is what cancel_event_registration
        // maintains: a gap would read to a learner as a queue that has stopped
        // moving.
        const waiting = (event.waitlisted ?? []).map((key, index) => ({
          id: idFor(`registration:${event.key}:${key}`),
          school_id: schoolId,
          event_id: eventId(event.key),
          profile_id: profileId(key),
          status: "waitlisted",
          waitlist_position: index + 1,
          // Later than everyone seated — that is why they are waiting.
          registered_at: new Date(startsAt.getTime() - 2 * DAY_MS),
          cancelled_at: null,
        }));

        const gone = (event.cancelled ?? []).map((key) => ({
          id: idFor(`registration:${event.key}:${key}`),
          school_id: schoolId,
          event_id: eventId(event.key),
          profile_id: profileId(key),
          status: "cancelled",
          waitlist_position: null,
          registered_at: registeredAt,
          cancelled_at: new Date(startsAt.getTime() - 3 * DAY_MS),
        }));

        return [...seated, ...waiting, ...gone];
      });

      await count("event_registrations", registrationRows, tx);

      // -- check-ins ------------------------------------------------------
      // The jti is what makes a replayed queue a no-op (R6). It is synthetic
      // here because src/lib/qr does not exist until Phase 3 and will define the
      // real token encoding; what matters now is that the column is populated
      // and unique per scan, so the idempotency constraint is exercised rather
      // than merely declared.
      interface Scan {
        id: string;
        eventKey: string;
        orgKey: string;
        learnerKey: string;
        scannedBy: string;
        scan: number;
        at: Date;
      }
      const scans: Scan[] = [];
      for (const event of events.events) {
        const starts = startOf.get(event.key) ?? now;
        const host = orgs.organizations.find((org) => org.key === event.orgKey);
        // Whoever holds the scanner at the gate. Falls back to the admin only if
        // an organization has no officers at all, which the seed data does not do.
        const scannedBy = host?.officers[0]?.learnerKey ?? adminKey;
        event.attendance.forEach((learnerKey, index) => {
          const times = (event.doubleScanned ?? []).includes(learnerKey) ? 2 : 1;
          for (let scan = 1; scan <= times; scan += 1) {
            scans.push({
              id: idFor(`checkin:${event.key}:${learnerKey}:${String(scan)}`),
              eventKey: event.key,
              orgKey: event.orgKey,
              learnerKey,
              scannedBy,
              scan,
              // Spread across the first part of the event, with a second scan
              // two hours later where one is declared.
              at: new Date(starts.getTime() + (10 + index) * 60_000 + (scan - 1) * 7_200_000),
            });
          }
        });
      }

      await count(
        "checkins",
        scans.map((scan) => ({
          id: scan.id,
          school_id: schoolId,
          event_id: eventId(scan.eventKey),
          profile_id: profileId(scan.learnerKey),
          jti: `demo-${scan.eventKey}-${scan.learnerKey}-${String(scan.scan)}`,
          scanned_at: scan.at,
          synced_at: new Date(scan.at.getTime() + 60_000),
          device_id: `demo-scanner-${scan.orgKey}`,
          method: "officer_scan",
          direction: "in",
          recorded_by: profileId(scan.scannedBy),
        })),
        tx,
      );

      // -- the ledger -----------------------------------------------------
      // Append-only, so these are inserted with `do nothing` on conflict: a
      // second run must add no XP, which is the same guarantee the sync endpoint
      // owes an offline queue.
      //
      // Attendance XP is written here as School Admin because D18's SECURITY
      // DEFINER function lands with the Phase 3 check-in slice. Every row still
      // cites the checkin it came from, so the audit chain the demo shows a
      // teacher is the real one and not a story.
      const attendXp = xpFor.get("attend_event") ?? 10;
      const ledger: Row[] = scans.map((scan) => ({
        id: idFor(`xp:checkin:${scan.eventKey}:${scan.learnerKey}:${String(scan.scan)}`),
        school_id: schoolId,
        profile_id: profileId(scan.learnerKey),
        season_id: seasonFor(scan.at),
        delta: attendXp,
        participation_type: "attend_event",
        source_type: "checkin",
        source_id: scan.id,
        reversal_of: null,
        reason: null,
        awarded_by: null,
        created_at: new Date(scan.at.getTime() + 60_000),
      }));

      for (const award of events.manualAwards) {
        const at = award.eventKey
          ? new Date((endOf.get(award.eventKey) ?? now).getTime() + DAY_MS)
          : daysFromNow(now, -35);
        ledger.push({
          id: idFor(`xp:manual:${award.profileKey}:${award.eventKey ?? "none"}:${award.participationType}`),
          school_id: schoolId,
          profile_id: profileId(award.profileKey),
          season_id: seasonFor(at),
          delta: xpFor.get(award.participationType) ?? 0,
          participation_type: award.participationType,
          source_type: "manual_adjustment",
          source_id: award.eventKey ? eventId(award.eventKey) : null,
          reversal_of: null,
          reason: award.reason,
          awarded_by: adminId,
          created_at: at,
        });
      }

      for (const correction of events.corrections) {
        const original = idFor(
          `xp:checkin:${correction.eventKey}:${correction.profileKey}:${String(correction.reversesScan)}`,
        );
        const at = new Date((endOf.get(correction.eventKey) ?? now).getTime() + 2 * DAY_MS);
        ledger.push({
          id: idFor(`xp:reversal:${correction.eventKey}:${correction.profileKey}:${String(correction.reversesScan)}`),
          school_id: schoolId,
          profile_id: profileId(correction.profileKey),
          season_id: seasonFor(at),
          delta: -attendXp,
          participation_type: "attend_event",
          source_type: "reversal",
          source_id: idFor(
            `checkin:${correction.eventKey}:${correction.profileKey}:${String(correction.reversesScan)}`,
          ),
          reversal_of: original,
          reason: correction.reason,
          awarded_by: adminId,
          created_at: at,
        });
      }
      await count("xp_ledger", ledger, tx, "nothing");

      // -- announcements --------------------------------------------------
      await count(
        "announcements",
        school.announcements.map((announcement) => ({
          id: idFor(`announcement:${announcement.key}`),
          school_id: schoolId,
          scope: announcement.scope,
          org_id: announcement.orgKey ? orgId(announcement.orgKey) : null,
          title: announcement.title,
          body: announcement.body,
          publish_at: daysFromNow(now, announcement.publishInDays),
          author_id: profileId(announcement.authorKey),
        })),
        tx,
      );

      // No leaderboard_snapshots row. The board is computed from the ledger; a
      // seeded snapshot would be the one thing in the demo capable of disagreeing
      // with the points it claims to summarise.

      const board = await tx<{ display_name: string; xp: number }[]>`
        SELECT p.display_name, SUM(l.delta)::int AS xp
        FROM xp_ledger l
        JOIN profiles p ON p.id = l.profile_id
        GROUP BY p.display_name
        ORDER BY xp DESC
        LIMIT 5
      `;
      return board.map((r) => ({ name: r.display_name, xp: r.xp }));
    });

    return { schoolId, counts, leaderboard };
  } finally {
    await sql.end();
  }
}

async function main(): Promise<void> {
  const url = requireEnv("DATABASE_URL");
  process.stdout.write("Seeding the demo tenant\n");
  const summary = await seedDemo(url);

  for (const [table, n] of Object.entries(summary.counts)) {
    process.stdout.write(`  ${table.padEnd(22)} ${String(n)}\n`);
  }
  process.stdout.write("\nTop of the board:\n");
  for (const row of summary.leaderboard) {
    process.stdout.write(`  ${String(row.xp).padStart(4)}  ${row.name}\n`);
  }
  process.stdout.write(
    `\nDemo school ${summary.schoolId}. Re-running changes nothing: every row is keyed, and the ledger is append-only.\n`,
  );
}

if (isMain(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
}
