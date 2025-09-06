CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"website_id" varchar,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"model" text NOT NULL,
	"tokens_used" integer NOT NULL,
	"cost_usd" integer NOT NULL,
	"operation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"backup_type" text NOT NULL,
	"data" jsonb NOT NULL,
	"wordpress_backup_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"report_type" text NOT NULL,
	"period" text NOT NULL,
	"data" jsonb NOT NULL,
	"insights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"roi_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"white_label_config" jsonb DEFAULT '{}'::jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"excerpt" text,
	"meta_description" text,
	"meta_title" text,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"ai_model" text NOT NULL,
	"seo_keywords" text[] DEFAULT '{}' NOT NULL,
	"seo_score" integer DEFAULT 0,
	"readability_score" integer DEFAULT 0,
	"plagiarism_score" integer DEFAULT 0,
	"brand_voice_score" integer DEFAULT 0,
	"fact_check_status" text DEFAULT 'pending',
	"eat_compliance" boolean DEFAULT false,
	"tokens_used" integer DEFAULT 0,
	"cost_usd" integer DEFAULT 0,
	"publish_date" timestamp,
	"wordpress_post_id" integer,
	"wordpress_url" text,
	"publish_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_approvals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_id" varchar NOT NULL,
	"reviewer_id" varchar NOT NULL,
	"status" text NOT NULL,
	"feedback" text,
	"quality_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"original_url" text NOT NULL,
	"filename" text NOT NULL,
	"alt_text" text NOT NULL,
	"generation_prompt" text NOT NULL,
	"cost_cents" integer NOT NULL,
	"image_style" text NOT NULL,
	"size" text DEFAULT '1024x1024' NOT NULL,
	"wordpress_media_id" integer,
	"wordpress_url" text,
	"status" text DEFAULT 'generated' NOT NULL,
	"upload_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_schedule" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"topic" text NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"content_id" varchar,
	"ab_test_variant" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"website_id" varchar,
	"action" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"success" boolean NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_audits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"url" text NOT NULL,
	"audit_type" text NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_fix_applied" boolean DEFAULT false,
	"auto_fix_results" jsonb DEFAULT '[]'::jsonb,
	"core_web_vitals" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"score" integer NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"page_speed_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"profile_name" text,
	"profile_email" text,
	"profile_company" text,
	"profile_timezone" text DEFAULT 'America/New_York',
	"notification_email_reports" boolean DEFAULT true,
	"notification_content_generated" boolean DEFAULT true,
	"notification_seo_issues" boolean DEFAULT true,
	"notification_system_alerts" boolean DEFAULT false,
	"automation_default_ai_model" text DEFAULT 'gpt-4o',
	"automation_auto_fix_seo_issues" boolean DEFAULT true,
	"automation_content_generation_frequency" text DEFAULT 'twice-weekly',
	"automation_report_generation" text DEFAULT 'weekly',
	"security_two_factor_auth" boolean DEFAULT false,
	"security_session_timeout" integer DEFAULT 24,
	"security_allow_api_access" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"wp_application_name" text NOT NULL,
	"wp_application_password" text NOT NULL,
	"wp_username" text,
	"ai_model" text DEFAULT 'gpt-4o' NOT NULL,
	"auto_posting" boolean DEFAULT false NOT NULL,
	"require_approval" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"seo_score" integer DEFAULT 0 NOT NULL,
	"content_count" integer DEFAULT 0 NOT NULL,
	"allowed_ips" text[] DEFAULT '{}',
	"api_rate_limit" integer DEFAULT 100 NOT NULL,
	"brand_voice" text DEFAULT 'professional',
	"content_guidelines" text,
	"target_audience" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backups" ADD CONSTRAINT "backups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backups" ADD CONSTRAINT "backups_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_reports" ADD CONSTRAINT "client_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_reports" ADD CONSTRAINT "client_reports_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_approvals" ADD CONSTRAINT "content_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_approvals" ADD CONSTRAINT "content_approvals_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_approvals" ADD CONSTRAINT "content_approvals_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_images" ADD CONSTRAINT "content_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_images" ADD CONSTRAINT "content_images_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_images" ADD CONSTRAINT "content_images_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_schedule" ADD CONSTRAINT "content_schedule_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_schedule" ADD CONSTRAINT "content_schedule_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_schedule" ADD CONSTRAINT "content_schedule_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audits" ADD CONSTRAINT "security_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audits" ADD CONSTRAINT "security_audits_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_logs_user_id" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_user_id" ON "ai_usage_tracking" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_backups_user_id" ON "backups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_client_reports_user_id" ON "client_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_content_user_id" ON "content" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_content_website_user" ON "content" USING btree ("website_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_content_approvals_user_id" ON "content_approvals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_content_images_content_id" ON "content_images" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_content_images_user_id" ON "content_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_content_schedule_user_id" ON "content_schedule" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_security_audits_user_id" ON "security_audits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_seo_audits_user_id" ON "seo_audits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_seo_reports_user_id" ON "seo_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_user_settings_user_id" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_websites_user_id" ON "websites" USING btree ("user_id");