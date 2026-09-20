CREATE TYPE "public"."announcement_scope" AS ENUM('school', 'org');--> statement-breakpoint
CREATE TYPE "public"."approval_decision" AS ENUM('approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."approval_role" AS ENUM('org_adviser', 'sslg_adviser', 'school_admin');--> statement-breakpoint
CREATE TYPE "public"."checkin_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."checkin_method" AS ENUM('officer_scan', 'learner_scan', 'manual');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('data_processing', 'media_release');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('web', 'android', 'ios');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."leaderboard_scope" AS ENUM('section', 'grade', 'org', 'school');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('applied', 'active', 'inactive', 'declined');--> statement-breakpoint
CREATE TYPE "public"."org_category" AS ENUM('academic', 'arts', 'sports', 'service', 'faith_based', 'special_interest');--> statement-breakpoint
CREATE TYPE "public"."org_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."participation_type" AS ENUM('attend_event', 'event_feedback', 'volunteer', 'committee_member', 'organize_event', 'external_representation');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('imported', 'active', 'archived', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('registered', 'waitlisted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('learner', 'org_officer', 'org_adviser', 'sslg_officer', 'sslg_adviser', 'moderator', 'guidance', 'school_head', 'school_admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."xp_source_type" AS ENUM('checkin', 'feedback', 'manual_adjustment', 'dispute_resolution', 'reversal');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"scope" "announcement_scope" NOT NULL,
	"org_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"publish_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"meta_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"jti" text NOT NULL,
	"scanned_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone,
	"device_id" text,
	"method" "checkin_method" NOT NULL,
	"direction" "checkin_direction" DEFAULT 'in' NOT NULL,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"recorded_by" uuid,
	"reference" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"platform" "device_platform" NOT NULL,
	"push_token" text,
	"is_scanner" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"approver_id" uuid,
	"role" "approval_role" NOT NULL,
	"decision" "approval_decision",
	"reason" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" "registration_status" DEFAULT 'registered' NOT NULL,
	"waitlist_position" integer,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"venue" text,
	"capacity" integer,
	"eligibility_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"requires_sslg_approval" boolean DEFAULT false NOT NULL,
	"publish_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"scope" "leaderboard_scope" NOT NULL,
	"scope_ref" text,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rows_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"level_number" integer NOT NULL,
	"threshold_xp" integer NOT NULL,
	"title" text NOT NULL,
	"badge_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_advisers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"term_start" date NOT NULL,
	"term_end" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'applied' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_officers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"position" text NOT NULL,
	"term_start" date NOT NULL,
	"term_end" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" "org_category" NOT NULL,
	"logo_key" text,
	"mission" text,
	"status" "org_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"lrn_hmac" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"grade_level" integer,
	"section" text,
	"avatar_key" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"hidden_from_boards" boolean DEFAULT false NOT NULL,
	"status" "profile_status" DEFAULT 'imported' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text,
	"settings_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"org_id" uuid,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"season_id" uuid,
	"delta" integer NOT NULL,
	"participation_type" "participation_type",
	"source_type" "xp_source_type" NOT NULL,
	"source_id" uuid,
	"reversal_of" uuid,
	"reason" text,
	"awarded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"participation_type" "participation_type" NOT NULL,
	"xp_value" integer NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_recorded_by_profiles_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_recorded_by_profiles_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_approvals" ADD CONSTRAINT "event_approvals_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_approvals" ADD CONSTRAINT "event_approvals_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_approvals" ADD CONSTRAINT "event_approvals_approver_id_profiles_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_advisers" ADD CONSTRAINT "org_advisers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_advisers" ADD CONSTRAINT "org_advisers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_advisers" ADD CONSTRAINT "org_advisers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_decided_by_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_officers" ADD CONSTRAINT "org_officers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_officers" ADD CONSTRAINT "org_officers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_officers" ADD CONSTRAINT "org_officers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_identifiers" ADD CONSTRAINT "profile_identifiers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_identifiers" ADD CONSTRAINT "profile_identifiers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_profiles_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_awarded_by_profiles_id_fk" FOREIGN KEY ("awarded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_rules" ADD CONSTRAINT "xp_rules_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_rules" ADD CONSTRAINT "xp_rules_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_school_id_idx" ON "announcements" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "announcements_publish_idx" ON "announcements" USING btree ("school_id","publish_at");--> statement-breakpoint
CREATE INDEX "audit_log_school_id_idx" ON "audit_log" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("school_id","action","created_at");--> statement-breakpoint
CREATE INDEX "checkins_school_id_idx" ON "checkins" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "checkins_event_idx" ON "checkins" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "checkins_profile_idx" ON "checkins" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_event_profile_jti_key" ON "checkins" USING btree ("event_id","profile_id","jti");--> statement-breakpoint
CREATE INDEX "consent_records_school_id_idx" ON "consent_records" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consent_records_profile_type_key" ON "consent_records" USING btree ("profile_id","consent_type");--> statement-breakpoint
CREATE INDEX "devices_school_id_idx" ON "devices" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "devices_profile_idx" ON "devices" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_push_token_key" ON "devices" USING btree ("school_id","push_token");--> statement-breakpoint
CREATE INDEX "event_approvals_school_id_idx" ON "event_approvals" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "event_approvals_event_idx" ON "event_approvals" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_approvals_event_role_key" ON "event_approvals" USING btree ("event_id","role");--> statement-breakpoint
CREATE INDEX "event_registrations_school_id_idx" ON "event_registrations" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "event_registrations_profile_idx" ON "event_registrations" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_registrations_event_profile_key" ON "event_registrations" USING btree ("event_id","profile_id");--> statement-breakpoint
CREATE INDEX "events_school_id_idx" ON "events" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "events_org_idx" ON "events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "events_status_starts_idx" ON "events" USING btree ("school_id","status","starts_at");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_school_id_idx" ON "leaderboard_snapshots" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_snapshots_season_scope_key" ON "leaderboard_snapshots" USING btree ("season_id","scope") WHERE "leaderboard_snapshots"."scope_ref" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_snapshots_season_scope_ref_key" ON "leaderboard_snapshots" USING btree ("season_id","scope","scope_ref") WHERE "leaderboard_snapshots"."scope_ref" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "levels_school_id_idx" ON "levels" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "levels_school_number_key" ON "levels" USING btree ("school_id","level_number");--> statement-breakpoint
CREATE INDEX "notifications_school_id_idx" ON "notifications" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "notifications_profile_idx" ON "notifications" USING btree ("profile_id","read_at");--> statement-breakpoint
CREATE INDEX "org_advisers_school_id_idx" ON "org_advisers" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "org_advisers_org_idx" ON "org_advisers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_advisers_profile_idx" ON "org_advisers" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "org_memberships_school_id_idx" ON "org_memberships" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "org_memberships_profile_idx" ON "org_memberships" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_memberships_org_profile_key" ON "org_memberships" USING btree ("org_id","profile_id");--> statement-breakpoint
CREATE INDEX "org_officers_school_id_idx" ON "org_officers" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "org_officers_org_idx" ON "org_officers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_officers_profile_idx" ON "org_officers" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "organizations_school_id_idx" ON "organizations" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_school_slug_key" ON "organizations" USING btree ("school_id","slug");--> statement-breakpoint
CREATE INDEX "organizations_category_idx" ON "organizations" USING btree ("school_id","category");--> statement-breakpoint
CREATE INDEX "profile_identifiers_school_id_idx" ON "profile_identifiers" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_identifiers_profile_key" ON "profile_identifiers" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_identifiers_school_lrn_key" ON "profile_identifiers" USING btree ("school_id","lrn_hmac");--> statement-breakpoint
CREATE INDEX "profiles_school_id_idx" ON "profiles" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_school_username_key" ON "profiles" USING btree ("school_id","username");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_section_idx" ON "profiles" USING btree ("school_id","grade_level","section");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_slug_key" ON "schools" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "seasons_school_id_idx" ON "seasons" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_school_name_key" ON "seasons" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "user_roles_school_id_idx" ON "user_roles" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "user_roles_profile_idx" ON "user_roles" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_school_scoped_unique" ON "user_roles" USING btree ("profile_id","role") WHERE "user_roles"."org_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_org_scoped_unique" ON "user_roles" USING btree ("profile_id","role","org_id") WHERE "user_roles"."org_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "xp_ledger_school_id_idx" ON "xp_ledger" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "xp_ledger_profile_idx" ON "xp_ledger" USING btree ("profile_id","season_id");--> statement-breakpoint
CREATE INDEX "xp_ledger_source_idx" ON "xp_ledger" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "xp_rules_school_id_idx" ON "xp_rules" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_rules_school_type_effective_key" ON "xp_rules" USING btree ("school_id","participation_type","effective_from");