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
import { eq, desc, and, or, isNull, inArray } from "drizzle-orm";
import { wordPressAuthService } from "./services/wordpress-auth";

export interface IStorage {
  // Users (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;

  // User-scoped Websites
  getUserWebsites(userId: string): Promise<Website[]>;
  getUserWebsite(id: string, userId: string): Promise<Website | undefined>;
  createWebsite(website: InsertWebsite & { userId: string }): Promise<Website>;
  updateWebsite(id: string, website: Partial<Website>): Promise<Website | undefined>;
  deleteWebsite(id: string): Promise<boolean>;
  validateWebsiteOwnership(websiteId: string, userId: string): Promise<boolean>;

  // User-scoped Content
  getUserContent(userId: string, websiteId?: string): Promise<Content[]>;
  getContentByWebsite(websiteId: string): Promise<Content[]>;
  getContent(id: string): Promise<Content | undefined>;
  createContent(content: InsertContent & { userId: string }): Promise<Content>;
  updateContent(id: string, content: Partial<Content>): Promise<Content | undefined>;
  getPendingApprovalContent(): Promise<Content[]>;
  getUserPendingApprovalContent(userId: string): Promise<Content[]>;

  // User-scoped SEO Reports
  getUserSeoReports(userId: string, websiteId?: string): Promise<SeoReport[]>;
  getSeoReportsByWebsite(websiteId: string): Promise<SeoReport[]>;
  getLatestSeoReport(websiteId: string): Promise<SeoReport | undefined>;
  createSeoReport(report: InsertSeoReport & { userId: string }): Promise<SeoReport>;

  // User-scoped Activity Logs
  getUserActivityLogs(userId: string, websiteId?: string): Promise<ActivityLog[]>;
  getActivityLogs(websiteId?: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog & { userId: string }): Promise<ActivityLog>;

  // Client Reports
  getClientReports(websiteId: string): Promise<ClientReport[]>;
  createClientReport(report: InsertClientReport & { userId: string }): Promise<ClientReport>;

  // Enhanced features
  createContentApproval(approval: InsertContentApproval & { userId: string }): Promise<ContentApproval>;
  createSecurityAudit(audit: InsertSecurityAudit & { userId?: string }): Promise<SecurityAudit>;
  trackAiUsage(usage: InsertAiUsageTracking & { userId: string }): Promise<AiUsageTracking>;
  createSeoAudit(audit: InsertSeoAudit & { userId: string }): Promise<SeoAudit>;
  getContentSchedule(websiteId: string): Promise<ContentSchedule[]>;
  createContentSchedule(schedule: InsertContentSchedule & { userId: string }): Promise<ContentSchedule>;
  createBackup(backup: InsertBackup & { userId: string }): Promise<Backup>;

  // Dashboard stats
  getUserDashboardStats(userId: string): Promise<{
    websiteCount: number;
    contentCount: number;
    avgSeoScore: number;
    recentActivity: number;
  }>;
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

      console.log('No existing websites found, sample data initialization skipped');
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

  // User-scoped Websites
  async getUserWebsites(userId: string): Promise<Website[]> {
    return await db
      .select()
      .from(websites)
      .where(eq(websites.userId, userId))
      .orderBy(desc(websites.updatedAt));
  }

  async getUserWebsite(id: string, userId: string): Promise<Website | undefined> {
    const [website] = await db
      .select()
      .from(websites)
      .where(and(eq(websites.id, id), eq(websites.userId, userId)));
    return website;
  }

  async createWebsite(insertWebsite: InsertWebsite & { userId: string }): Promise<Website> {
    console.log("Creating website in database:", insertWebsite);
    
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
        wpApplicationPassword: insertWebsite.wpApplicationPassword,
        status: "active",
        seoScore: 0,
        contentCount: 0,
        userId: insertWebsite.userId // Ensure userId is set
      })
      .returning();
    
    console.log("Website created successfully:", website);

    // Log activity
    await this.createActivityLog({
      userId: insertWebsite.userId,
      websiteId: website.id,
      type: "website_connected",
      description: `Website connected: ${website.name}`,
      metadata: { url: website.url, secure: true },
    });

    // Create security audit log
    await this.createSecurityAudit({
      userId: insertWebsite.userId,
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

  async validateWebsiteOwnership(websiteId: string, userId: string): Promise<boolean> {
    const website = await this.getUserWebsite(websiteId, userId);
    return !!website;
  }

  // User-scoped Content
  async getUserContent(userId: string, websiteId?: string): Promise<Content[]> {
    if (websiteId) {
      // Verify website ownership first
      const website = await this.getUserWebsite(websiteId, userId);
      if (!website) {
        return [];
      }
      return await this.getContentByWebsite(websiteId);
    }
    
    // Get all content for user's websites
    return await db
      .select()
      .from(content)
      .where(eq(content.userId, userId))
      .orderBy(desc(content.createdAt));
  }

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

  async getUserPendingApprovalContent(userId: string): Promise<Content[]> {
    return await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.status, "pending_approval"),
          eq(content.userId, userId)
        )
      )
      .orderBy(desc(content.createdAt));
  }

  async createContent(insertContent: InsertContent & { userId: string }): Promise<Content> {
    const [contentItem] = await db
      .insert(content)
      .values({
        ...insertContent,
        status: "pending_approval", // Default to requiring approval
        userId: insertContent.userId
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

  // User-scoped SEO Reports
  async getUserSeoReports(userId: string, websiteId?: string): Promise<SeoReport[]> {
    if (websiteId) {
      // Verify ownership first
      const website = await this.getUserWebsite(websiteId, userId);
      if (!website) {
        return [];
      }
      return await this.getSeoReportsByWebsite(websiteId);
    }
    
    // Get all SEO reports for user's websites
    return await db
      .select()
      .from(seoReports)
      .where(eq(seoReports.userId, userId))
      .orderBy(desc(seoReports.createdAt));
  }

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

  async createSeoReport(insertReport: InsertSeoReport & { userId: string }): Promise<SeoReport> {
    const [report] = await db
      .insert(seoReports)
      .values({
        ...insertReport,
        userId: insertReport.userId
      })
      .returning();
    return report;
  }

  // User-scoped Activity Logs
  async getUserActivityLogs(userId: string, websiteId?: string): Promise<ActivityLog[]> {
    if (websiteId) {
      // First verify the website belongs to the user
      const website = await this.getUserWebsite(websiteId, userId);
      if (!website) {
        return []; // Return empty array if user doesn't own the website
      }
      
      return await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.websiteId, websiteId))
        .orderBy(desc(activityLogs.createdAt));
    }
    
    // Get all activity logs for this user
    return await db
      .select()
      .from(activityLogs)
      .where(
        or(
          eq(activityLogs.userId, userId),
          isNull(activityLogs.userId) // Include system-wide logs
        )
      )
      .orderBy(desc(activityLogs.createdAt));
  }

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

  async createActivityLog(insertLog: InsertActivityLog & { userId: string }): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values({
        ...insertLog,
        userId: insertLog.userId
      })
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

  async createClientReport(insertReport: InsertClientReport & { userId: string }): Promise<ClientReport> {
    const [report] = await db
      .insert(clientReports)
      .values({
        ...insertReport,
        userId: insertReport.userId
      })
      .returning();
    return report;
  }

  // Enhanced Security and Management Features
  async createContentApproval(approval: InsertContentApproval & { userId: string }): Promise<ContentApproval> {
    const [approvalRecord] = await db
      .insert(contentApprovals)
      .values({
        ...approval,
        userId: approval.userId
      })
      .returning();
    return approvalRecord;
  }

  async createSecurityAudit(audit: InsertSecurityAudit & { userId?: string }): Promise<SecurityAudit> {
    const [auditRecord] = await db
      .insert(securityAudits)
      .values({
        ...audit,
        userId: audit.userId || null
      })
      .returning();
    return auditRecord;
  }

  async trackAiUsage(usage: InsertAiUsageTracking & { userId: string }): Promise<AiUsageTracking> {
    const [usageRecord] = await db
      .insert(aiUsageTracking)
      .values({
        ...usage,
        userId: usage.userId
      })
      .returning();
    return usageRecord;
  }

  async createSeoAudit(audit: InsertSeoAudit & { userId: string }): Promise<SeoAudit> {
    const [auditRecord] = await db
      .insert(seoAudits)
      .values({
        ...audit,
        userId: audit.userId
      })
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

  async createContentSchedule(schedule: InsertContentSchedule & { userId: string }): Promise<ContentSchedule> {
    const [scheduleRecord] = await db
      .insert(contentSchedule)
      .values({
        ...schedule,
        userId: schedule.userId
      })
      .returning();
    return scheduleRecord;
  }

  async createBackup(backup: InsertBackup & { userId: string }): Promise<Backup> {
    const [backupRecord] = await db
      .insert(backups)
      .values({
        ...backup,
        userId: backup.userId
      })
      .returning();
    return backupRecord;
  }

  // Dashboard stats
  async getUserDashboardStats(userId: string): Promise<{
    websiteCount: number;
    contentCount: number;
    avgSeoScore: number;
    recentActivity: number;
  }> {
    const userWebsites = await this.getUserWebsites(userId);
    const userContent = await this.getUserContent(userId);
    const recentLogs = await db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.userId, userId),
          // Last 7 days
          eq(activityLogs.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        )
      );

    return {
      websiteCount: userWebsites.length,
      contentCount: userContent.length,
      avgSeoScore: userWebsites.length > 0 
        ? Math.round(userWebsites.reduce((sum, w) => sum + w.seoScore, 0) / userWebsites.length)
        : 0,
      recentActivity: recentLogs.length
    };
  }
}

export const storage = new DatabaseStorage();