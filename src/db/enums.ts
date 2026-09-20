import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enumerations are database types, not TypeScript unions, because a value that
 * only exists in application code is a value the database will one day hold in
 * violation of. See docs/SYSTEM_DESIGN.md §4.2.
 */

export const userRole = pgEnum("user_role", [
  "learner",
  "org_officer",
  "org_adviser",
  "sslg_officer",
  "sslg_adviser",
  "moderator",
  "guidance",
  "school_head",
  "school_admin",
  "super_admin",
]);

export const profileStatus = pgEnum("profile_status", [
  "imported", // roster row exists, no account yet
  "active",
  "archived", // graduated or transferred — retained, not deleted (T14)
  "suspended",
]);

export const consentType = pgEnum("consent_type", ["data_processing", "media_release"]);

export const orgCategory = pgEnum("org_category", [
  "academic",
  "arts",
  "sports",
  "service",
  "faith_based",
  "special_interest",
]);

export const orgStatus = pgEnum("org_status", ["active", "inactive"]);

export const membershipStatus = pgEnum("membership_status", [
  "applied",
  "active",
  "inactive",
  "declined",
]);

export const eventStatus = pgEnum("event_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "completed",
]);

export const approvalRole = pgEnum("approval_role", [
  "org_adviser",
  "sslg_adviser",
  "school_admin",
]);

export const approvalDecision = pgEnum("approval_decision", ["approved", "rejected"]);

export const registrationStatus = pgEnum("registration_status", [
  "registered",
  "waitlisted",
  "cancelled",
]);

export const checkinMethod = pgEnum("checkin_method", ["officer_scan", "learner_scan", "manual"]);

export const checkinDirection = pgEnum("checkin_direction", ["in", "out"]);

export const participationType = pgEnum("participation_type", [
  "attend_event",
  "event_feedback",
  "volunteer",
  "committee_member",
  "organize_event",
  "external_representation",
]);

export const xpSourceType = pgEnum("xp_source_type", [
  "checkin",
  "feedback",
  "manual_adjustment",
  "dispute_resolution",
  "reversal",
]);

export const leaderboardScope = pgEnum("leaderboard_scope", ["section", "grade", "org", "school"]);

export const announcementScope = pgEnum("announcement_scope", ["school", "org"]);

export const devicePlatform = pgEnum("device_platform", ["web", "android", "ios"]);
