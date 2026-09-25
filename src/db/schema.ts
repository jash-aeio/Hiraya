import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  pgView,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  announcementScope,
  approvalDecision,
  approvalRole,
  checkinDirection,
  checkinMethod,
  consentType,
  devicePlatform,
  eventStatus,
  leaderboardScope,
  membershipStatus,
  orgCategory,
  orgStatus,
  participationType,
  profileStatus,
  registrationStatus,
  userRole,
  xpSourceType,
} from "./enums";

// Re-exported so the enum types are part of the schema drizzle-kit reads. Without
// this, `db:generate` emits tables that reference types it never creates.
export * from "./enums";

/**
 * Hiraya core schema - docs/SYSTEM_DESIGN.md section 4.
 *
 * Two rules govern every table here and neither is negotiable (CLAUDE.md R1, R4):
 *
 *   1. Every table except `schools` carries `school_id uuid NOT NULL`, indexed,
 *      and is isolated by RLS in src/db/rls/. Tenancy is a database invariant;
 *      application filtering is a convenience that will one day be forgotten.
 *   2. `xp_ledger` and `audit_log` are append-only. They carry no `updated_at`,
 *      because an update timestamp on an immutable table is a lie about what
 *      the table is.
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const schoolId = () =>
  uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "restrict" });

// ---------------------------------------------------------------------------
// Tenant root
// ---------------------------------------------------------------------------

export const schools = pgTable(
  "schools",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    abbreviation: text("abbreviation"),
    settingsJson: jsonb("settings_json").notNull().default({}),
    // Drives the DEMO DATA marker. A tenant that cannot prove it is synthetic
    // is treated as real, so this defaults to false.
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("schools_slug_key").on(t.slug)],
);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const profiles = pgTable(
  "profiles",
  {
    id: id(),
    schoolId: schoolId(),
    // Supabase Auth user. Null until activation: a roster import creates the
    // profile, the learner creates the account (docs/DATA_FLOW.md section 3).
    userId: uuid("user_id"),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    gradeLevel: integer("grade_level"),
    section: text("section"),
    avatarKey: text("avatar_key"),
    locale: text("locale").notNull().default("en"),
    hiddenFromBoards: boolean("hidden_from_boards").notNull().default(false),
    status: profileStatus("status").notNull().default("imported"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("profiles_school_id_idx").on(t.schoolId),
    uniqueIndex("profiles_school_username_key").on(t.schoolId, t.username),
    uniqueIndex("profiles_user_id_key").on(t.userId),
    index("profiles_section_idx").on(t.schoolId, t.gradeLevel, t.section),
  ],
);

/**
 * The LRN hash lives in its own table, not on `profiles`.
 *
 * Postgres RLS is row-level: a policy cannot hide one column from one role.
 * The rule "LRN is never returned below School Admin" (CLAUDE.md section 6) is
 * only enforceable by the database if the value sits in a row that non-admins
 * cannot select at all. This costs one join at import time and makes the
 * privacy rule an invariant rather than a query-writing habit.
 */
export const profileIdentifiers = pgTable(
  "profile_identifiers",
  {
    id: id(),
    schoolId: schoolId(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // HMAC-SHA256 with a server-side pepper. The plaintext LRN is never stored,
    // never logged, and never rendered. Import matches on the hash.
    lrnHmac: text("lrn_hmac").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("profile_identifiers_school_id_idx").on(t.schoolId),
    uniqueIndex("profile_identifiers_profile_key").on(t.profileId),
    // Per-school uniqueness is what makes roster import idempotent (FR-1.1).
    uniqueIndex("profile_identifiers_school_lrn_key").on(t.schoolId, t.lrnHmac),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: id(),
    schoolId: schoolId(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: userRole("role").notNull(),
    // Null org_id = school-scoped role. A user holds multiple rows.
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("user_roles_school_id_idx").on(t.schoolId),
    index("user_roles_profile_idx").on(t.profileId),
    // Two partial indexes rather than one, because NULLs do not collide: without
    // the first, a school-scoped role could be granted to the same person twice.
    uniqueIndex("user_roles_school_scoped_unique")
      .on(t.profileId, t.role)
      .where(sql`${t.orgId} IS NULL`),
    uniqueIndex("user_roles_org_scoped_unique")
      .on(t.profileId, t.role, t.orgId)
      .where(sql`${t.orgId} IS NOT NULL`),
  ],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: id(),
    schoolId: schoolId(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    consentType: consentType("consent_type").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
    recordedBy: uuid("recorded_by").references(() => profiles.id, { onDelete: "set null" }),
    // A pointer to the paper form held by the school. Scans and images of
    // signed forms are never uploaded (docs/DATA_FLOW.md section 4).
    reference: text("reference"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("consent_records_school_id_idx").on(t.schoolId),
    uniqueIndex("consent_records_profile_type_key").on(t.profileId, t.consentType),
  ],
);

export const devices = pgTable(
  "devices",
  {
    id: id(),
    schoolId: schoolId(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    platform: devicePlatform("platform").notNull(),
    pushToken: text("push_token"),
    isScanner: boolean("is_scanner").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("devices_school_id_idx").on(t.schoolId),
    index("devices_profile_idx").on(t.profileId),
    uniqueIndex("devices_push_token_key").on(t.schoolId, t.pushToken),
  ],
);

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    schoolId: schoolId(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: orgCategory("category").notNull(),
    logoKey: text("logo_key"),
    mission: text("mission"),
    status: orgStatus("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("organizations_school_id_idx").on(t.schoolId),
    uniqueIndex("organizations_school_slug_key").on(t.schoolId, t.slug),
    index("organizations_category_idx").on(t.schoolId, t.category),
  ],
);

export const orgMemberships = pgTable(
  "org_memberships",
  {
    id: id(),
    schoolId: schoolId(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: membershipStatus("status").notNull().default("applied"),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("org_memberships_school_id_idx").on(t.schoolId),
    index("org_memberships_profile_idx").on(t.profileId),
    uniqueIndex("org_memberships_org_profile_key").on(t.orgId, t.profileId),
  ],
);

export const orgOfficers = pgTable(
  "org_officers",
  {
    id: id(),
    schoolId: schoolId(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    position: text("position").notNull(),
    // Term bounds preserve history across officer turnover, which is annual.
    termStart: date("term_start").notNull(),
    termEnd: date("term_end"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("org_officers_school_id_idx").on(t.schoolId),
    index("org_officers_org_idx").on(t.orgId),
    index("org_officers_profile_idx").on(t.profileId),
  ],
);

export const orgAdvisers = pgTable(
  "org_advisers",
  {
    id: id(),
    schoolId: schoolId(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    termStart: date("term_start").notNull(),
    termEnd: date("term_end"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("org_advisers_school_id_idx").on(t.schoolId),
    index("org_advisers_org_idx").on(t.orgId),
    index("org_advisers_profile_idx").on(t.profileId),
  ],
);

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const events = pgTable(
  "events",
  {
    id: id(),
    schoolId: schoolId(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    venue: text("venue"),
    capacity: integer("capacity"),
    // { gradeLevels: number[], sections: string[], orgIds: uuid[] } - the
    // service tells a learner which criterion excluded them (NOT_ELIGIBLE).
    eligibilityJson: jsonb("eligibility_json").notNull().default({}),
    status: eventStatus("status").notNull().default("draft"),
    requiresSslgApproval: boolean("requires_sslg_approval").notNull().default(false),
    // The demo's standing live event (D-07). Set by db:seed:demo on the one
    // event the scanner points at, and read only by public.demo_roll_live_events
    // (src/db/rls/08_demo_rolling_event.sql), which re-centres that event's
    // window on now so a tenant seeded months ago is still walkable. Harmless
    // on a real tenant: the function will not touch a school without is_demo.
    demoRollsLive: boolean("demo_rolls_live").notNull().default(false),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("events_school_id_idx").on(t.schoolId),
    index("events_org_idx").on(t.orgId),
    index("events_status_starts_idx").on(t.schoolId, t.status, t.startsAt),
    // One standing live event per school, as a database fact rather than a
    // check in the seed script. public.demo_roll_live_events rewrites the window
    // of every row this flag is set on, so a second one would have its timetable
    // moved to today on every persona switch — and if it were a past event, out
    // from under the XP rows that cite it. The seed still refuses a second
    // `happeningNow`, because a clear error beats a constraint violation; this
    // is what makes the rule true regardless of who is writing.
    uniqueIndex("events_one_rolling_live_per_school")
      .on(t.schoolId)
      .where(sql`${t.demoRollsLive}`),
  ],
);

export const eventApprovals = pgTable(
  "event_approvals",
  {
    id: id(),
    schoolId: schoolId(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    approverId: uuid("approver_id").references(() => profiles.id, { onDelete: "set null" }),
    role: approvalRole("role").notNull(),
    decision: approvalDecision("decision"),
    // Required on reject, enforced in the service: a silent rejection is how
    // officers stop using the system (docs/SYSTEM_DESIGN.md section 3.1).
    reason: text("reason"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("event_approvals_school_id_idx").on(t.schoolId),
    index("event_approvals_event_idx").on(t.eventId),
    uniqueIndex("event_approvals_event_role_key").on(t.eventId, t.role),
  ],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: id(),
    schoolId: schoolId(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: registrationStatus("status").notNull().default("registered"),
    waitlistPosition: integer("waitlist_position"),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("event_registrations_school_id_idx").on(t.schoolId),
    index("event_registrations_profile_idx").on(t.profileId),
    uniqueIndex("event_registrations_event_profile_key").on(t.eventId, t.profileId),
  ],
);

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

export const checkins = pgTable(
  "checkins",
  {
    id: id(),
    schoolId: schoolId(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // The QR token id. Replaying an entire offline queue must be a no-op, and
    // this is the column that makes it one (CLAUDE.md R6).
    jti: text("jti").notNull(),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    deviceId: text("device_id"),
    method: checkinMethod("method").notNull(),
    direction: checkinDirection("direction").notNull().default("in"),
    recordedBy: uuid("recorded_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("checkins_school_id_idx").on(t.schoolId),
    index("checkins_event_idx").on(t.eventId),
    index("checkins_profile_idx").on(t.profileId),
    // The idempotency key. Not an application convention - a constraint.
    uniqueIndex("checkins_event_profile_jti_key").on(t.eventId, t.profileId, t.jti),
  ],
);

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

export const seasons = pgTable(
  "seasons",
  {
    id: id(),
    schoolId: schoolId(),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("seasons_school_id_idx").on(t.schoolId),
    uniqueIndex("seasons_school_name_key").on(t.schoolId, t.name),
  ],
);

export const xpRules = pgTable(
  "xp_rules",
  {
    id: id(),
    schoolId: schoolId(),
    participationType: participationType("participation_type").notNull(),
    xpValue: integer("xp_value").notNull(),
    // Rules are versioned rather than edited so a past award can be explained
    // by the rule that was in force when it was made.
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("xp_rules_school_id_idx").on(t.schoolId),
    uniqueIndex("xp_rules_school_type_effective_key").on(
      t.schoolId,
      t.participationType,
      t.effectiveFrom,
    ),
  ],
);

export const levels = pgTable(
  "levels",
  {
    id: id(),
    schoolId: schoolId(),
    levelNumber: integer("level_number").notNull(),
    thresholdXp: integer("threshold_xp").notNull(),
    // Kasapi, Lingkod, Tagapagtaguyod, Bayani (FR-5.4). Thresholds are product
    // parameters tuned during the pilot, not design constants.
    title: text("title").notNull(),
    badgeKey: text("badge_key"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("levels_school_id_idx").on(t.schoolId),
    uniqueIndex("levels_school_number_key").on(t.schoolId, t.levelNumber),
  ],
);

/**
 * Append-only (CLAUDE.md R4). No UPDATE or DELETE grant exists for any role,
 * including admins and the service role, and a trigger rejects the attempt
 * even from the table owner. Corrections are reversal rows citing the original.
 *
 * There is deliberately no `updated_at`.
 */
export const xpLedger = pgTable(
  "xp_ledger",
  {
    id: id(),
    schoolId: schoolId(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    participationType: participationType("participation_type"),
    sourceType: xpSourceType("source_type").notNull(),
    // Every row cites the verified action behind it - checkin_id, feedback_id -
    // so any point can be audited back to something a teacher confirmed.
    sourceId: uuid("source_id"),
    reversalOf: uuid("reversal_of"),
    reason: text("reason"),
    awardedBy: uuid("awarded_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("xp_ledger_school_id_idx").on(t.schoolId),
    index("xp_ledger_profile_idx").on(t.profileId, t.seasonId),
    index("xp_ledger_source_idx").on(t.sourceType, t.sourceId),
  ],
);

export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: id(),
    schoolId: schoolId(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    scope: leaderboardScope("scope").notNull(),
    // Section name, grade level, or org id, depending on `scope`.
    scopeRef: text("scope_ref"),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
    rowsJson: jsonb("rows_json").notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("leaderboard_snapshots_school_id_idx").on(t.schoolId),
    // Partial pair, for the same reason as user_roles: the school-wide scope has
    // no scope_ref, and two NULLs would not collide.
    uniqueIndex("leaderboard_snapshots_season_scope_key")
      .on(t.seasonId, t.scope)
      .where(sql`${t.scopeRef} IS NULL`),
    uniqueIndex("leaderboard_snapshots_season_scope_ref_key")
      .on(t.seasonId, t.scope, t.scopeRef)
      .where(sql`${t.scopeRef} IS NOT NULL`),
  ],
);

/**
 * Derived XP totals per profile - lifetime, current season, and the level the
 * lifetime total has reached (D19).
 *
 * Declared `.existing()` because this view is defined in
 * `src/db/rls/04_xp_balances.sql`, not by a migration: its whole security
 * property is the `security_invoker = true` option, and that belongs beside
 * the policies it defers to rather than in generated SQL nobody reads twice.
 * Drizzle is told its shape here only so queries against it are typed.
 *
 * Every column but the first four is nullable, and for a reason each time: a
 * school with no current season, a learner below the lowest threshold, a
 * learner at the top with no next threshold to climb to.
 */
export const xpBalances = pgView("xp_balances", {
  schoolId: uuid("school_id").notNull(),
  profileId: uuid("profile_id").notNull(),
  currentSeasonId: uuid("current_season_id"),
  lifetimeXp: integer("lifetime_xp").notNull(),
  seasonXp: integer("season_xp").notNull(),
  levelNumber: integer("level_number"),
  levelTitle: text("level_title"),
  badgeKey: text("badge_key"),
  levelThresholdXp: integer("level_threshold_xp"),
  nextThresholdXp: integer("next_threshold_xp"),
}).existing();

// ---------------------------------------------------------------------------
// Announcements and notifications
// ---------------------------------------------------------------------------

export const announcements = pgTable(
  "announcements",
  {
    id: id(),
    schoolId: schoolId(),
    scope: announcementScope("scope").notNull(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    publishAt: timestamp("publish_at", { withTimezone: true }).notNull().defaultNow(),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("announcements_school_id_idx").on(t.schoolId),
    index("announcements_publish_idx").on(t.schoolId, t.publishAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    schoolId: schoolId(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    // Payloads carry ids and a display name at most - never LRN, section, or
    // anything else a lock-screen preview should not show (CLAUDE.md R8).
    payloadJson: jsonb("payload_json").notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("notifications_school_id_idx").on(t.schoolId),
    index("notifications_profile_idx").on(t.profileId, t.readAt),
  ],
);

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/**
 * Append-only, ids only, never names (CLAUDE.md R8). Every admin action and
 * every access to the non-participant list writes a row here.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    schoolId: schoolId(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    metaJson: jsonb("meta_json").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_log_school_id_idx").on(t.schoolId),
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_action_idx").on(t.schoolId, t.action, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const schoolsRelations = relations(schools, ({ many }) => ({
  profiles: many(profiles),
  organizations: many(organizations),
  events: many(events),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  school: one(schools, { fields: [profiles.schoolId], references: [schools.id] }),
  roles: many(userRoles),
  memberships: many(orgMemberships),
  registrations: many(eventRegistrations),
  checkins: many(checkins),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  school: one(schools, { fields: [organizations.schoolId], references: [schools.id] }),
  memberships: many(orgMemberships),
  officers: many(orgOfficers),
  advisers: many(orgAdvisers),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  school: one(schools, { fields: [events.schoolId], references: [schools.id] }),
  org: one(organizations, { fields: [events.orgId], references: [organizations.id] }),
  approvals: many(eventApprovals),
  registrations: many(eventRegistrations),
  checkins: many(checkins),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  event: one(events, { fields: [checkins.eventId], references: [events.id] }),
  profile: one(profiles, { fields: [checkins.profileId], references: [profiles.id] }),
}));
