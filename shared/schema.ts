import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const websites = pgTable("websites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  wpUsername: text("wp_username").notNull(),
  wpPassword: text("wp_password").notNull(),
  aiModel: text("ai_model").notNull().default("gpt-4o"),
  autoPosting: boolean("auto_posting").notNull().default(true),
  status: text("status").notNull().default("active"), // active, processing, issues
  seoScore: integer("seo_score").notNull().default(0),
  contentCount: integer("content_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"), // draft, generating, published, scheduled
  aiModel: text("ai_model").notNull(),
  seoKeywords: text("seo_keywords").array().notNull().default([]),
  publishDate: timestamp("publish_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const seoReports = pgTable("seo_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  score: integer("score").notNull(),
  issues: jsonb("issues").notNull().default([]),
  recommendations: jsonb("recommendations").notNull().default([]),
  pageSpeedScore: integer("page_speed_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  websiteId: varchar("website_id").references(() => websites.id),
  type: text("type").notNull(), // content_generated, seo_analysis, issue_detected, etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clientReports = pgTable("client_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  websiteId: varchar("website_id").notNull().references(() => websites.id),
  reportType: text("report_type").notNull(), // weekly, monthly
  period: text("period").notNull(),
  data: jsonb("data").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWebsiteSchema = createInsertSchema(websites).pick({
  name: true,
  url: true,
  wpUsername: true,
  wpPassword: true,
  aiModel: true,
  autoPosting: true,
});

export const insertContentSchema = createInsertSchema(content).pick({
  websiteId: true,
  title: true,
  body: true,
  aiModel: true,
  seoKeywords: true,
  publishDate: true,
});

export const insertSeoReportSchema = createInsertSchema(seoReports).pick({
  websiteId: true,
  score: true,
  issues: true,
  recommendations: true,
  pageSpeedScore: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  websiteId: true,
  type: true,
  description: true,
  metadata: true,
});

export const insertClientReportSchema = createInsertSchema(clientReports).pick({
  websiteId: true,
  reportType: true,
  period: true,
  data: true,
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
