import { 
  users,
  websites,
  content,
  seoReports,
  activityLogs,
  clientReports,
  contentApprovals,
  securityAudits,
  aiUsageTracking,
  seoAudits,
  contentSchedule,
  backups,
  type User, 
  type UpsertUser,
  type InsertUser, 
  type Website, 
  type InsertWebsite,
  type Content,
  type InsertContent,
  type SeoReport,
  type InsertSeoReport,
  type ActivityLog,
  type InsertActivityLog,
  type ClientReport,
  type InsertClientReport,
  type ContentApproval,
  type InsertContentApproval,
  type SecurityAudit,
  type InsertSecurityAudit,
  type AiUsageTracking,
  type InsertAiUsageTracking,
  type SeoAudit,
  type InsertSeoAudit,
  type ContentSchedule,
  type InsertContentSchedule,
  type Backup,
  type InsertBackup
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { wordPressAuthService } from "./services/wordpress-auth";

export interface IStorage {
  // Users (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;

  // Websites
  getWebsites(): Promise<Website[]>;
  getWebsite(id: string): Promise<Website | undefined>;
  createWebsite(website: InsertWebsite): Promise<Website>;
  updateWebsite(id: string, website: Partial<Website>): Promise<Website | undefined>;
  deleteWebsite(id: string): Promise<boolean>;

  // Content
  getContentByWebsite(websiteId: string): Promise<Content[]>;
  getContent(id: string): Promise<Content | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: string, content: Partial<Content>): Promise<Content | undefined>;
  getPendingApprovalContent(): Promise<Content[]>;

  // SEO Reports
  getSeoReportsByWebsite(websiteId: string): Promise<SeoReport[]>;
  getLatestSeoReport(websiteId: string): Promise<SeoReport | undefined>;
  createSeoReport(report: InsertSeoReport): Promise<SeoReport>;

  // Activity Logs
  getActivityLogs(websiteId?: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Client Reports
  getClientReports(websiteId: string): Promise<ClientReport[]>;
  createClientReport(report: InsertClientReport): Promise<ClientReport>;

  // Enhanced features
  createContentApproval(approval: InsertContentApproval): Promise<ContentApproval>;
  createSecurityAudit(audit: InsertSecurityAudit): Promise<SecurityAudit>;
  trackAiUsage(usage: InsertAiUsageTracking): Promise<AiUsageTracking>;
  createSeoAudit(audit: InsertSeoAudit): Promise<SeoAudit>;
  getContentSchedule(websiteId: string): Promise<ContentSchedule[]>;
  createContentSchedule(schedule: InsertContentSchedule): Promise<ContentSchedule>;
  createBackup(backup: InsertBackup): Promise<Backup>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with sample data if needed
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    try {
      // Check if sample data already exists
      const existingWebsites = await db.select().from(websites).limit(1);
      if (existingWebsites.length > 0) return;

      // Create sample websites with secure Application Password format
      const sampleWebsites = [
        {
          name: "TechBlog.com",
          url: "https://techblog.com",
          wpApplicationName: "AI Content Manager - TechBlog",
          wpApplicationPassword: "demo-encrypted-app-password-1", // Would be encrypted in real use
          wpUsername: "admin",
          aiModel: "gpt-4o",
          autoPosting: false, // Default to manual approval
          requireApproval: true,
          status: "active",
          seoScore: 92,
          contentCount: 24,
          brandVoice: "technical",
          targetAudience: "developers",
        },
        {
          name: "E-Commerce.store",
          url: "https://e-commerce.store",
          wpApplicationName: "AI Content Manager - ECommerce",
          wpApplicationPassword: "demo-encrypted-app-password-2",
          wpUsername: "admin",
          aiModel: "gpt-4o",
          autoPosting: false,
          requireApproval: true,
          status: "processing",
          seoScore: 78,
          contentCount: 18,
          brandVoice: "friendly",
          targetAudience: "online shoppers",
        },
        {
          name: "RestaurantSite.com",
          url: "https://restaurantsite.com",
          wpApplicationName: "AI Content Manager - Restaurant",
          wpApplicationPassword: "demo-encrypted-app-password-3",
          wpUsername: "admin",
          aiModel: "claude-3",
          autoPosting: false,
          requireApproval: true,
          status: "issues",
          seoScore: 65,
          contentCount: 12,
          brandVoice: "warm",
          targetAudience: "local diners",
        },
      ];

      await db.insert(websites).values(sampleWebsites);

      // Sample activity logs
      const sampleActivities = [
        {
          websiteId: null, // System-wide activity
          type: "system_init",
          description: "WordPress AI automation platform initialized",
          metadata: { version: "2.0", secure: true },
        },
        {
          websiteId: null,
          type: "security_upgrade",
          description: "Upgraded to WordPress Application Passwords authentication",
          metadata: { previousAuth: "username/password", newAuth: "application_passwords" },
        },
      ];

      await db.insert(activityLogs).values(sampleActivities);
    } catch (error) {
      console.error('Failed to initialize sample data:', error);
    }
  }

  // Users (Required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: userData,
      })
      .returning();
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Websites
  async getWebsites(): Promise<Website[]> {
    return await db
      .select()
      .from(websites)
      .orderBy(desc(websites.updatedAt));
  }

  async getWebsite(id: string): Promise<Website | undefined> {
    const [website] = await db.select().from(websites).where(eq(websites.id, id));
    return website;
  }

  async createWebsite(insertWebsite: InsertWebsite): Promise<Website> {
    // Encrypt the application password before storing
    const encryptedPassword = wordPressAuthService.encryptCredentials({
      applicationName: insertWebsite.wpApplicationName,
      applicationPassword: insertWebsite.wpApplicationPassword,
      username: insertWebsite.wpUsername || 'admin'
    });

    const [website] = await db
      .insert(websites)
      .values({
        ...insertWebsite,
        wpApplicationPassword: encryptedPassword.encrypted,
        status: "active",
        seoScore: 0,
        contentCount: 0,
      })
      .returning();
    
    // Log activity
    await this.createActivityLog({
      websiteId: website.id,
      type: "website_connected",
      description: `Website connected: ${website.name}`,
      metadata: { url: website.url, secure: true },
    });

    // Create security audit log
    await this.createSecurityAudit({
      websiteId: website.id,
      action: "website_connection",
      success: true,
      metadata: { 
        authType: "application_password", 
        applicationName: insertWebsite.wpApplicationName 
      },
    });

    return website;
  }

  async updateWebsite(id: string, updates: Partial<Website>): Promise<Website | undefined> {
    const [website] = await db
      .update(websites)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(websites.id, id))
      .returning();
    return website;
  }

  async deleteWebsite(id: string): Promise<boolean> {
    const result = await db.delete(websites).where(eq(websites.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Content
  async getContentByWebsite(websiteId: string): Promise<Content[]> {
    return await db
      .select()
      .from(content)
      .where(eq(content.websiteId, websiteId))
      .orderBy(desc(content.createdAt));
  }

  async getContent(id: string): Promise<Content | undefined> {
    const [contentItem] = await db.select().from(content).where(eq(content.id, id));
    return contentItem;
  }

  async getPendingApprovalContent(): Promise<Content[]> {
    return await db
      .select()
      .from(content)
      .where(eq(content.status, "pending_approval"))
      .orderBy(desc(content.createdAt));
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const [contentItem] = await db
      .insert(content)
      .values({
        ...insertContent,
        status: "pending_approval", // Default to requiring approval
      })
      .returning();
    return contentItem;
  }

  async updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined> {
    const [contentItem] = await db
      .update(content)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(content.id, id))
      .returning();
    return contentItem;
  }

  // SEO Reports
  async getSeoReportsByWebsite(websiteId: string): Promise<SeoReport[]> {
    return await db
      .select()
      .from(seoReports)
      .where(eq(seoReports.websiteId, websiteId))
      .orderBy(desc(seoReports.createdAt));
  }

  async getLatestSeoReport(websiteId: string): Promise<SeoReport | undefined> {
    const [report] = await db
      .select()
      .from(seoReports)
      .where(eq(seoReports.websiteId, websiteId))
      .orderBy(desc(seoReports.createdAt))
      .limit(1);
    return report;
  }

  async createSeoReport(insertReport: InsertSeoReport): Promise<SeoReport> {
    const [report] = await db
      .insert(seoReports)
      .values(insertReport)
      .returning();
    return report;
  }

  // Activity Logs
  async getActivityLogs(websiteId?: string): Promise<ActivityLog[]> {
    if (websiteId) {
      return await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.websiteId, websiteId))
        .orderBy(desc(activityLogs.createdAt));
    }
    
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  // Client Reports
  async getClientReports(websiteId: string): Promise<ClientReport[]> {
    return await db
      .select()
      .from(clientReports)
      .where(eq(clientReports.websiteId, websiteId))
      .orderBy(desc(clientReports.generatedAt));
  }

  async createClientReport(insertReport: InsertClientReport): Promise<ClientReport> {
    const [report] = await db
      .insert(clientReports)
      .values(insertReport)
      .returning();
    return report;
  }

  // Enhanced Security and Management Features
  async createContentApproval(approval: InsertContentApproval): Promise<ContentApproval> {
    const [approvalRecord] = await db
      .insert(contentApprovals)
      .values(approval)
      .returning();
    return approvalRecord;
  }

  async createSecurityAudit(audit: InsertSecurityAudit): Promise<SecurityAudit> {
    const [auditRecord] = await db
      .insert(securityAudits)
      .values(audit)
      .returning();
    return auditRecord;
  }

  async trackAiUsage(usage: InsertAiUsageTracking): Promise<AiUsageTracking> {
    const [usageRecord] = await db
      .insert(aiUsageTracking)
      .values(usage)
      .returning();
    return usageRecord;
  }

  async createSeoAudit(audit: InsertSeoAudit): Promise<SeoAudit> {
    const [auditRecord] = await db
      .insert(seoAudits)
      .values(audit)
      .returning();
    return auditRecord;
  }

  async getContentSchedule(websiteId: string): Promise<ContentSchedule[]> {
    return await db
      .select()
      .from(contentSchedule)
      .where(eq(contentSchedule.websiteId, websiteId))
      .orderBy(desc(contentSchedule.scheduledDate));
  }

  async createContentSchedule(schedule: InsertContentSchedule): Promise<ContentSchedule> {
    const [scheduleRecord] = await db
      .insert(contentSchedule)
      .values(schedule)
      .returning();
    return scheduleRecord;
  }

  async createBackup(backup: InsertBackup): Promise<Backup> {
    const [backupRecord] = await db
      .insert(backups)
      .values(backup)
      .returning();
    return backupRecord;
  }
}

export const storage = new DatabaseStorage();
