CREATE TABLE "user_api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"key_name" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"masked_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"validation_status" text DEFAULT 'pending' NOT NULL,
	"last_validated" timestamp,
	"validation_error" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_api_keys_user_id" ON "user_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_api_keys_provider" ON "user_api_keys" USING btree ("provider");