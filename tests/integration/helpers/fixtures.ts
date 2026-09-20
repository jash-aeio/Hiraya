import type { Sql } from "postgres";

/**
 * Seeds one complete synthetic tenant: one row in every table that carries a
 * school_id.
 *
 * Every table matters. The cross-tenant test is only as good as its coverage, and
 * the table that gets forgotten here is exactly the table whose policy nobody
 * checks. `TENANT_TABLES` is asserted against the live schema in rls.test.ts, so
 * a table added in a later migration fails the suite until it is seeded.
 *
 * Names are obviously synthetic. No fixture in this repository may resemble a
 * real learner: nothing real enters any environment before Gate B.
 */

export const TENANT_TABLES = [
  "profiles",
  "profile_identifiers",
  "user_roles",
  "consent_records",
  "devices",
  "organizations",
  "org_memberships",
  "org_officers",
  "org_advisers",
  "events",
  "event_approvals",
  "event_registrations",
  "checkins",
  "seasons",
  "xp_rules",
  "levels",
  "xp_ledger",
  "leaderboard_snapshots",
  "announcements",
  "notifications",
  "audit_log",
] as const;

export interface Tenant {
  schoolId: string;
  adminProfileId: string;
  learnerProfileId: string;
  orgId: string;
  eventId: string;
  seasonId: string;
}

export async function seedTenant(sql: Sql, slug: string): Promise<Tenant> {
  const [school] = await sql<{ id: string }[]>`
    INSERT INTO schools (slug, name, abbreviation, is_demo)
    VALUES (${slug}, ${`Test School ${slug}`}, ${slug.toUpperCase()}, true)
    RETURNING id
  `;
  const schoolId = school!.id;

  const [admin] = await sql<{ id: string }[]>`
    INSERT INTO profiles (school_id, username, display_name, status)
    VALUES (${schoolId}, ${`${slug}-admin`}, 'Fixture Admin', 'active')
    RETURNING id
  `;
  const adminProfileId = admin!.id;

  const [learner] = await sql<{ id: string }[]>`
    INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
    VALUES (${schoolId}, ${`${slug}-learner`}, 'Fixture Learner', 9, 'Sampaguita', 'active')
    RETURNING id
  `;
  const learnerProfileId = learner!.id;

  await sql`
    INSERT INTO profile_identifiers (school_id, profile_id, lrn_hmac)
    VALUES (${schoolId}, ${learnerProfileId}, ${`hmac-${slug}-learner`})
  `;

  await sql`
    INSERT INTO user_roles (school_id, profile_id, role)
    VALUES (${schoolId}, ${adminProfileId}, 'school_admin'),
           (${schoolId}, ${learnerProfileId}, 'learner')
  `;

  await sql`
    INSERT INTO consent_records (school_id, profile_id, consent_type, granted_at, recorded_by, reference)
    VALUES (${schoolId}, ${learnerProfileId}, 'data_processing', now(), ${adminProfileId}, ${`form-${slug}-001`})
  `;

  await sql`
    INSERT INTO devices (school_id, profile_id, platform, push_token, is_scanner)
    VALUES (${schoolId}, ${learnerProfileId}, 'android', ${`push-${slug}`}, false)
  `;

  const [org] = await sql<{ id: string }[]>`
    INSERT INTO organizations (school_id, name, slug, category)
    VALUES (${schoolId}, 'Fixture Club', ${`${slug}-club`}, 'academic')
    RETURNING id
  `;
  const orgId = org!.id;

  await sql`
    INSERT INTO org_memberships (school_id, org_id, profile_id, status)
    VALUES (${schoolId}, ${orgId}, ${learnerProfileId}, 'active')
  `;
  await sql`
    INSERT INTO org_officers (school_id, org_id, profile_id, position, term_start)
    VALUES (${schoolId}, ${orgId}, ${learnerProfileId}, 'President', CURRENT_DATE)
  `;
  await sql`
    INSERT INTO org_advisers (school_id, org_id, profile_id, is_primary, term_start)
    VALUES (${schoolId}, ${orgId}, ${adminProfileId}, true, CURRENT_DATE)
  `;

  const [event] = await sql<{ id: string }[]>`
    INSERT INTO events (school_id, org_id, title, starts_at, ends_at, venue, status, publish_at, created_by)
    VALUES (${schoolId}, ${orgId}, 'Fixture Science Fair',
            now() - interval '2 hours', now() + interval '2 hours',
            'Covered Court', 'approved', now(), ${learnerProfileId})
    RETURNING id
  `;
  const eventId = event!.id;

  await sql`
    INSERT INTO event_approvals (school_id, event_id, approver_id, role, decision, decided_at)
    VALUES (${schoolId}, ${eventId}, ${adminProfileId}, 'org_adviser', 'approved', now())
  `;
  await sql`
    INSERT INTO event_registrations (school_id, event_id, profile_id, status)
    VALUES (${schoolId}, ${eventId}, ${learnerProfileId}, 'registered')
  `;
  await sql`
    INSERT INTO checkins (school_id, event_id, profile_id, jti, scanned_at, synced_at, device_id, method)
    VALUES (${schoolId}, ${eventId}, ${learnerProfileId}, ${`jti-${slug}-001`}, now(), now(), ${`device-${slug}`}, 'officer_scan')
  `;

  const [season] = await sql<{ id: string }[]>`
    INSERT INTO seasons (school_id, name, starts_on, ends_on, is_current)
    VALUES (${schoolId}, 'Fixture Quarter', CURRENT_DATE - 30, CURRENT_DATE + 30, true)
    RETURNING id
  `;
  const seasonId = season!.id;

  await sql`
    INSERT INTO xp_rules (school_id, participation_type, xp_value, created_by)
    VALUES (${schoolId}, 'attend_event', 10, ${adminProfileId})
  `;
  await sql`
    INSERT INTO levels (school_id, level_number, threshold_xp, title, badge_key)
    VALUES (${schoolId}, 1, 0, 'Kasapi', 'level-1')
  `;
  await sql`
    INSERT INTO xp_ledger (school_id, profile_id, season_id, delta, participation_type, source_type, awarded_by)
    VALUES (${schoolId}, ${learnerProfileId}, ${seasonId}, 10, 'attend_event', 'checkin', ${adminProfileId})
  `;
  await sql`
    INSERT INTO leaderboard_snapshots (school_id, season_id, scope, rows_json)
    VALUES (${schoolId}, ${seasonId}, 'school', '[]'::jsonb)
  `;
  await sql`
    INSERT INTO announcements (school_id, scope, title, body, author_id)
    VALUES (${schoolId}, 'school', 'Fixture notice', 'Body text.', ${adminProfileId})
  `;
  await sql`
    INSERT INTO notifications (school_id, profile_id, type, payload_json)
    VALUES (${schoolId}, ${adminProfileId}, 'fixture', '{}'::jsonb)
  `;
  await sql`
    INSERT INTO audit_log (school_id, actor_id, action, target_type, target_id)
    VALUES (${schoolId}, ${adminProfileId}, 'fixture.seed', 'school', ${schoolId})
  `;

  return { schoolId, adminProfileId, learnerProfileId, orgId, eventId, seasonId };
}
