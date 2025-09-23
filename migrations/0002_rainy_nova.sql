CREATE TABLE "applied_fixes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"issue_type" text NOT NULL,
	"issue_title" text NOT NULL,
	"issue_description" text,
	"issue_hash" text NOT NULL,
	"fix_type" text NOT NULL,
	"fix_description" text NOT NULL,
	"fix_success" boolean NOT NULL,
	"fix_error" text,
	"wordpress_post_id" integer,
	"element_path" text,
	"before_value" text,
	"after_value" text,
	"fix_batch_id" varchar,
	"ai_model" text,
	"score_before" integer,
	"score_after" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"name" text NOT NULL,
	"frequency" text NOT NULL,
	"time_of_day" text NOT NULL,
	"custom_days" text[] DEFAULT '{}',
	"topics" text[] DEFAULT '{}',
	"keywords" text,
	"tone" text,
	"word_count" integer DEFAULT 1000,
	"brand_voice" text,
	"target_audience" text,
	"eat_compliance" boolean DEFAULT false,
	"ai_provider" text DEFAULT 'openai',
	"include_images" boolean DEFAULT false,
	"image_count" integer DEFAULT 1,
	"image_style" text,
	"seo_optimized" boolean DEFAULT true,
	"auto_publish" boolean DEFAULT false,
	"publish_delay" integer DEFAULT 0,
	"topic_rotation" text DEFAULT 'sequential',
	"next_topic_index" integer DEFAULT 0,
	"max_daily_cost" numeric(10, 2) DEFAULT '10.00',
	"max_monthly_posts" integer DEFAULT 30,
	"cost_today" numeric(10, 2) DEFAULT '0.00',
	"posts_this_month" integer DEFAULT 0,
	"last_run" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cloudinary_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar,
	"month" timestamp NOT NULL,
	"images_uploaded" integer DEFAULT 0,
	"total_bytes_stored" integer DEFAULT 0,
	"bandwidth_used" integer DEFAULT 0,
	"credits_used" integer DEFAULT 0,
	"transformations_count" integer DEFAULT 0,
	"estimated_cost_cents" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "failed_image_uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_id" varchar,
	"website_id" varchar,
	"dalle_url" text,
	"cloudinary_error" text,
	"filename" varchar(255),
	"alt_text" text,
	"prompt" text,
	"error_message" text,
	"error_code" varchar(50),
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"status" text DEFAULT 'pending_retry',
	"failed_at" timestamp DEFAULT now() NOT NULL,
	"last_retry_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "gsc_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"picture" text,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expiry" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_configurations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"is_configured" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gsc_configurations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "gsc_indexing_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"property_id" varchar NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"notify_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_properties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"website_id" varchar,
	"site_url" text NOT NULL,
	"permission_level" text NOT NULL,
	"site_type" text NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"last_synced" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gsc_properties_site_url_unique" UNIQUE("site_url")
);
--> statement-breakpoint
CREATE TABLE "gsc_quota_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar,
	"date" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"limit" integer DEFAULT 200 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_issue_statuses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"issue_hash" text NOT NULL,
	"issue_type" text NOT NULL,
	"issue_title" text NOT NULL,
	"issue_description" text,
	"issue_severity" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"status_reason" text,
	"fix_attempts" integer DEFAULT 0 NOT NULL,
	"last_fix_attempt" timestamp,
	"last_fix_error" text,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution_notes" text,
	"first_detected" timestamp DEFAULT now() NOT NULL,
	"last_detected" timestamp DEFAULT now() NOT NULL,
	"detection_count" integer DEFAULT 1 NOT NULL,
	"wordpress_post_id" integer,
	"element_path" text,
	"current_value" text,
	"recommended_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seo_issue_statuses_issue_hash_unique" UNIQUE("issue_hash")
);
--> statement-breakpoint
CREATE TABLE "seo_issue_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"issue_type" varchar(100) NOT NULL,
	"issue_title" varchar(500) NOT NULL,
	"issue_description" text,
	"severity" text DEFAULT 'warning' NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"auto_fix_available" boolean DEFAULT false NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"fixed_at" timestamp,
	"resolved_at" timestamp,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"fix_method" text,
	"fix_session_id" varchar(255),
	"fix_before" text,
	"fix_after" text,
	"ai_model" varchar(100),
	"tokens_used" integer,
	"element_path" text,
	"current_value" text,
	"recommended_value" text,
	"resolved_by" text,
	"resolution_notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "cloudinary_data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "featured_image_url" text;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "featured_image_cloudinary_id" text;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "has_images" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "total_image_cost" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_url" text;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_secure_url" text;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_public_id" text;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_format" varchar(20);--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_width" integer;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_height" integer;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_bytes" integer;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_version" varchar(20);--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_optimized_url" text;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "cloudinary_uploaded_at" timestamp;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "image_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "content_images" ADD COLUMN "is_featured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "content_schedule" ADD COLUMN "has_images" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "content_schedule" ADD COLUMN "image_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "content_schedule" ADD COLUMN "cloudinary_image_ids" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "seo_reports" ADD COLUMN "has_tracked_issues" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD COLUMN "fixable_issues_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD COLUMN "critical_issues_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "applied_fixes" ADD CONSTRAINT "applied_fixes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applied_fixes" ADD CONSTRAINT "applied_fixes_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_schedules" ADD CONSTRAINT "auto_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_schedules" ADD CONSTRAINT "auto_schedules_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudinary_usage" ADD CONSTRAINT "cloudinary_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudinary_usage" ADD CONSTRAINT "cloudinary_usage_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_image_uploads" ADD CONSTRAINT "failed_image_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_image_uploads" ADD CONSTRAINT "failed_image_uploads_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_image_uploads" ADD CONSTRAINT "failed_image_uploads_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_accounts" ADD CONSTRAINT "gsc_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_configurations" ADD CONSTRAINT "gsc_configurations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_indexing_requests" ADD CONSTRAINT "gsc_indexing_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_indexing_requests" ADD CONSTRAINT "gsc_indexing_requests_property_id_gsc_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."gsc_properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_properties" ADD CONSTRAINT "gsc_properties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_properties" ADD CONSTRAINT "gsc_properties_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issue_statuses" ADD CONSTRAINT "seo_issue_statuses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issue_statuses" ADD CONSTRAINT "seo_issue_statuses_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issue_tracking" ADD CONSTRAINT "seo_issue_tracking_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issue_tracking" ADD CONSTRAINT "seo_issue_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_applied_fixes_user_website" ON "applied_fixes" USING btree ("user_id","website_id");--> statement-breakpoint
CREATE INDEX "idx_applied_fixes_issue_hash" ON "applied_fixes" USING btree ("issue_hash");--> statement-breakpoint
CREATE INDEX "idx_applied_fixes_batch" ON "applied_fixes" USING btree ("fix_batch_id");--> statement-breakpoint
CREATE INDEX "idx_auto_schedules_user_id" ON "auto_schedules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auto_schedules_website_id" ON "auto_schedules" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "idx_auto_schedules_active" ON "auto_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_auto_schedules_last_run" ON "auto_schedules" USING btree ("last_run");--> statement-breakpoint
CREATE INDEX "idx_cloudinary_usage_user_website" ON "cloudinary_usage" USING btree ("user_id","website_id");--> statement-breakpoint
CREATE INDEX "idx_cloudinary_usage_month" ON "cloudinary_usage" USING btree ("month");--> statement-breakpoint
CREATE INDEX "idx_failed_uploads_status" ON "failed_image_uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_failed_uploads_content" ON "failed_image_uploads" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_gsc_accounts_user_id" ON "gsc_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gsc_accounts_account_id" ON "gsc_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_gsc_accounts_email" ON "gsc_accounts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_gsc_accounts_user_id_account_id" ON "gsc_accounts" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_gsc_config_user_id" ON "gsc_configurations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gsc_indexing_user_id" ON "gsc_indexing_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gsc_indexing_status" ON "gsc_indexing_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gsc_properties_user_id" ON "gsc_properties" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gsc_properties_account_id" ON "gsc_properties" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_gsc_quota_account_date" ON "gsc_quota_usage" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_statuses_user_website" ON "seo_issue_statuses" USING btree ("user_id","website_id");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_statuses_hash" ON "seo_issue_statuses" USING btree ("issue_hash");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_statuses_status" ON "seo_issue_statuses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_statuses_type" ON "seo_issue_statuses" USING btree ("issue_type");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_tracking_website_user" ON "seo_issue_tracking" USING btree ("website_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_tracking_status" ON "seo_issue_tracking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_tracking_issue_type" ON "seo_issue_tracking" USING btree ("issue_type");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_tracking_severity" ON "seo_issue_tracking" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_tracking_detected_at" ON "seo_issue_tracking" USING btree ("detected_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_seo_issue_tracking_last_seen_at" ON "seo_issue_tracking" USING btree ("last_seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_seo_issue_tracking_auto_fix" ON "seo_issue_tracking" USING btree ("auto_fix_available");--> statement-breakpoint
CREATE INDEX "idx_seo_issue_tracking_website_status_type" ON "seo_issue_tracking" USING btree ("website_id","status","issue_type");--> statement-breakpoint
CREATE INDEX "idx_content_images_cloudinary_public_id" ON "content_images" USING btree ("cloudinary_public_id");--> statement-breakpoint
CREATE INDEX "idx_content_images_order" ON "content_images" USING btree ("content_id","image_order");