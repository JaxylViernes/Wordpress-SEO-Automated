import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const websites = pgTable("websites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  name: text("name").notNull(),
  url: text("url").notNull(),
  // Secure WordPress Application Password authentication
  wpApplicationName: text("wp_application_name").notNull(),
  wpApplicationPassword: text("wp_application_password").notNull(), // Encrypted
  wpUsername: text("wp_username"), // For display only, not authentication
  
  // AI and automation settings
  aiModel: text("ai_model").notNull().default("gpt-4o"),
  autoPosting: boolean("auto_posting").notNull().default(false), // Default to manual approval
  requireApproval: boolean("require_approval").notNull().default(true),
  
  // Performance and status
  status: text("status").notNull().default("active"), // active, processing, issues, suspended
  seoScore: integer("seo_score").notNull().default(0),
  contentCount: integer("content_count").notNull().default(0),
  
  // Security and access control
  allowedIPs: text("allowed_ips").array().default([]),
  apiRateLimit: integer("api_rate_limit").notNull().default(100), // requests per hour
  
  // Content quality settings
  brandVoice: text("brand_voice").default("professional"),
  contentGuidelines: text("content_guidelines"),
  targetAudience: text("target_audience"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // Add index for efficient user-website lookups
  index("idx_websites_user_id").on(table.userId),
]);

export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  excerpt: text("excerpt"),
  metaDescription: text("meta_description"),
  metaTitle: text("meta_title"),
  
  // Content approval and workflow
  status: text("status").notNull().default("pending_approval"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  // AI and SEO data
  aiModel: text("ai_model").notNull(),
  seoKeywords: text("seo_keywords").array().notNull().default([]),
  seoScore: integer("seo_score").default(0),
  readabilityScore: integer("readability_score").default(0),
  plagiarismScore: integer("plagiarism_score").default(0),
  
  // Content quality and brand compliance
  brandVoiceScore: integer("brand_voice_score").default(0),
  factCheckStatus: text("fact_check_status").default("pending"),
  eatCompliance: boolean("eat_compliance").default(false),
  
  // NEW FIELDS - Add these to save AI results properly
  tokensUsed: integer("tokens_used").default(0),
  costUsd: integer("cost_usd").default(0), // Store as cents (multiply by 100)
  
  // Scheduling and publishing
  publishDate: timestamp("publish_date"),
  wordpressPostId: integer("wordpress_post_id"),

  wordpressUrl: text("wordpress_url"),
  publishError: text("publish_error"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_content_user_id").on(table.userId),
  index("idx_content_website_user").on(table.websiteId, table.userId),
]);

export const seoReports = pgTable("seo_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  score: integer("score").notNull(),
  issues: jsonb("issues").notNull().default([]),
  recommendations: jsonb("recommendations").notNull().default([]),
  pageSpeedScore: integer("page_speed_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_seo_reports_user_id").on(table.userId),
]);

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE (nullable for system logs)
  websiteId: varchar("website_id").references(() => websites.id),
  type: text("type").notNull(), // content_generated, seo_analysis, issue_detected, etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_activity_logs_user_id").on(table.userId),
]);

export const clientReports = pgTable("client_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  reportType: text("report_type").notNull(), // weekly, monthly, quarterly
  period: text("period").notNull(),
  data: jsonb("data").notNull(),
  insights: jsonb("insights").notNull().default([]),
  roiData: jsonb("roi_data").notNull().default({}),
  whiteLabelConfig: jsonb("white_label_config").default({}),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_client_reports_user_id").on(table.userId),
]);

// New tables for enhanced functionality
export const contentApprovals = pgTable("content_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  contentId: varchar("content_id").notNull().references(() => content.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  status: text("status").notNull(), // approved, rejected, needs_revision
  feedback: text("feedback"),
  qualityScore: integer("quality_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_content_approvals_user_id").on(table.userId),
]);

export const securityAudits = pgTable("security_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  websiteId: varchar("website_id").references(() => websites.id),
  action: text("action").notNull(), // login, content_publish, seo_change, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_security_audits_user_id").on(table.userId),
]);

export const aiUsageTracking = pgTable("ai_usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  model: text("model").notNull(),
  tokensUsed: integer("tokens_used").notNull(),
  costUsd: integer("cost_usd").notNull(), // Store as cents
  operation: text("operation").notNull(), // content_generation, seo_analysis, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_ai_usage_user_id").on(table.userId),
]);

export const seoAudits = pgTable("seo_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  url: text("url").notNull(),
  auditType: text("audit_type").notNull(), // technical, content, performance
  findings: jsonb("findings").notNull().default([]),
  autoFixApplied: boolean("auto_fix_applied").default(false),
  autoFixResults: jsonb("auto_fix_results").default([]),
  coreWebVitals: jsonb("core_web_vitals").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_seo_audits_user_id").on(table.userId),
]);

export const contentSchedule = pgTable("content_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  topic: text("topic").notNull(),
  keywords: text("keywords").array().notNull().default([]),
  status: text("status").notNull().default("planned"), // planned, generating, ready, published
  contentId: varchar("content_id").references(() => content.id),
  abTestVariant: text("ab_test_variant"), // A, B, or null
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_content_schedule_user_id").on(table.userId),
]);

export const backups = pgTable("backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // ADD THIS LINE
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  backupType: text("backup_type").notNull(), // content, settings, full
  data: jsonb("data").notNull(),
  wordpressBackupId: text("wordpress_backup_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_backups_user_id").on(table.userId),
]);

// Insert schemas - UPDATED to include userId
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWebsiteSchema = createInsertSchema(websites).pick({
  name: true,
  url: true,
  wpApplicationName: true,
  wpApplicationPassword: true,
  wpUsername: true,
  aiModel: true,
  autoPosting: true,
  requireApproval: true,
  brandVoice: true,
  contentGuidelines: true,
  targetAudience: true,
  // userId will be added automatically in the backend
});

export const insertContentSchema = createInsertSchema(content).pick({
  websiteId: true,
  title: true,
  body: true,
  excerpt: true,
  metaDescription: true,
  metaTitle: true,
  aiModel: true,
  seoKeywords: true,
  publishDate: true,
  seoScore: true,
  readabilityScore: true,
  brandVoiceScore: true,
  tokensUsed: true,
  costUsd: true,
  eatCompliance: true,
  // userId will be added automatically in the backend
});

export const insertSeoReportSchema = createInsertSchema(seoReports).pick({
  websiteId: true,
  score: true,
  issues: true,
  recommendations: true,
  pageSpeedScore: true,
  // userId will be added automatically in the backend
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  websiteId: true,
  type: true,
  description: true,
  metadata: true,
  // userId will be added automatically in the backend
});

export const insertClientReportSchema = createInsertSchema(clientReports).pick({
  websiteId: true,
  reportType: true,
  period: true,
  data: true,
  insights: true,
  roiData: true,
  whiteLabelConfig: true,
  // userId will be added automatically in the backend
});

// New insert schemas for enhanced tables - UPDATED
export const insertContentApprovalSchema = createInsertSchema(contentApprovals).pick({
  contentId: true,
  reviewerId: true,
  status: true,
  feedback: true,
  qualityScore: true,
  // userId will be added automatically in the backend
});

export const insertSecurityAuditSchema = createInsertSchema(securityAudits).pick({
  websiteId: true,
  action: true,
  ipAddress: true,
  userAgent: true,
  success: true,
  metadata: true,
  // userId will be added automatically in the backend
});

export const insertAiUsageTrackingSchema = createInsertSchema(aiUsageTracking).pick({
  websiteId: true,
  model: true,
  tokensUsed: true,
  costUsd: true,
  operation: true,
  // userId will be added automatically in the backend
});

export const insertSeoAuditSchema = createInsertSchema(seoAudits).pick({
  websiteId: true,
  url: true,
  auditType: true,
  findings: true,
  autoFixApplied: true,
  autoFixResults: true,
  coreWebVitals: true,
  // userId will be added automatically in the backend
});

export const insertContentScheduleSchema = createInsertSchema(contentSchedule).pick({
  websiteId: true,
  scheduledDate: true,
  topic: true,
  keywords: true,
  abTestVariant: true,
  // userId will be added automatically in the backend
});

export const insertBackupSchema = createInsertSchema(backups).pick({
  websiteId: true,
  backupType: true,
  data: true,
  wordpressBackupId: true,
  // userId will be added automatically in the backend
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;
export type Website = typeof websites.$inferSelect;

export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof content.$inferSelect;

export type InsertSeoReport = z.infer<typeof insertSeoReportSchema>;
export type SeoReport = typeof seoReports.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertClientReport = z.infer<typeof insertClientReportSchema>;
export type ClientReport = typeof clientReports.$inferSelect;

// Enhanced types
export type InsertContentApproval = z.infer<typeof insertContentApprovalSchema>;
export type ContentApproval = typeof contentApprovals.$inferSelect;

export type InsertSecurityAudit = z.infer<typeof insertSecurityAuditSchema>;
export type SecurityAudit = typeof securityAudits.$inferSelect;

export type InsertAiUsageTracking = z.infer<typeof insertAiUsageTrackingSchema>;
export type AiUsageTracking = typeof aiUsageTracking.$inferSelect;

export type InsertSeoAudit = z.infer<typeof insertSeoAuditSchema>;
export type SeoAudit = typeof seoAudits.$inferSelect;

export type InsertContentSchedule = z.infer<typeof insertContentScheduleSchema>;
export type ContentSchedule = typeof contentSchedule.$inferSelect;

export type InsertBackup = z.infer<typeof insertBackupSchema>;
export type Backup = typeof backups.$inferSelect;

// User session type for Replit Auth compatibility
export type UpsertUser = typeof users.$inferInsert;