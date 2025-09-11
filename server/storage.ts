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
  userSettings,
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
  type InsertBackup,
  type UserSettings, // Add this line
  type InsertUserSettings // Add this line
} from "@shared/schema";
import { 
  userApiKeys,
  type UserApiKey,
  type InsertUserApiKey
} from "@shared/schema";
import { apiKeyEncryptionService } from "./services/api-key-encryption";
import { db } from "./db";
import { lte, gte, count, eq, desc, and, or, isNull, inArray } from "drizzle-orm";
import { wordPressAuthService } from "./services/wordpress-auth";
import { contentImages, insertContentImageSchema, type InsertContentImage, type ContentImage } from "@shared/schema";
//nadagdag
import { autoSchedules, type AutoSchedule, type InsertAutoSchedule } from "@shared/schema";
import { randomUUID } from 'crypto';



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

  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;
  deleteUserSettings(userId: string): Promise<boolean>;
  getOrCreateUserSettings(userId: string): Promise<UserSettings>;


   getUserApiKeys(userId: string): Promise<UserApiKey[]>;
  getUserApiKey(userId: string, keyId: string): Promise<UserApiKey | undefined>;
  createUserApiKey(userId: string, data: {
    provider: string;
    keyName: string;
    apiKey: string;
  }): Promise<UserApiKey>;
  updateUserApiKey(userId: string, keyId: string, updates: Partial<{
    keyName: string;
    isActive: boolean;
    validationStatus: string;
    lastValidated: Date;
    validationError: string;
    usageCount: number;
    lastUsed: Date;
  }>): Promise<UserApiKey | undefined>;
  deleteUserApiKey(userId: string, keyId: string): Promise<boolean>;
  getDecryptedApiKey(userId: string, keyId: string): Promise<string | null>;
  validateUserApiKey(userId: string, keyId: string): Promise<{ valid: boolean; error?: string }>;

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

  async createContentImage(data: InsertContentImage & { userId: string }): Promise<ContentImage> {
  const validatedData = insertContentImageSchema.parse(data);
  const imageWithUserId = { ...validatedData, userId: data.userId };
  
  const [image] = await db.insert(contentImages).values(imageWithUserId).returning();
  return image;
}

// Get images for a specific content piece
async getContentImages(contentId: string): Promise<ContentImage[]> {
  return db
    .select()
    .from(contentImages)
    .where(eq(contentImages.contentId, contentId))
    .orderBy(contentImages.createdAt);
}

// Update content image (for WordPress upload info)
async updateContentImage(imageId: string, updates: Partial<{
  wordpressMediaId: number;
  wordpressUrl: string;
  status: string;
  uploadError: string;
}>): Promise<ContentImage | null> {
  const [updated] = await db
    .update(contentImages)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(contentImages.id, imageId))
    .returning();
  
  return updated || null;
}

// Get images by user (for dashboard/analytics)
async getUserContentImages(userId: string, limit: number = 50): Promise<ContentImage[]> {
  return db
    .select()
    .from(contentImages)
    .where(eq(contentImages.userId, userId))
    .orderBy(desc(contentImages.createdAt))
    .limit(limit);
}

// Delete content images (cascade when content is deleted)
async deleteContentImages(contentId: string): Promise<void> {
  await this.db.delete(contentImages).where(eq(contentImages.contentId, contentId));
}

// Get image usage statistics for a user
async getUserImageStats(userId: string): Promise<{
  totalImages: number;
  totalCostCents: number;
  imagesThisMonth: number;
  costThisMonthCents: number;
}> {
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const [allTimeStats] = await this.db
    .select({
      totalImages: count(),
      totalCostCents: sum(contentImages.costCents)
    })
    .from(contentImages)
    .where(eq(contentImages.userId, userId));

  const [monthlyStats] = await this.db
    .select({
      imagesThisMonth: count(),
      costThisMonthCents: sum(contentImages.costCents)
    })
    .from(contentImages)
    .where(
      and(
        eq(contentImages.userId, userId),
        gte(contentImages.createdAt, thisMonth)
      )
    );

  return {
    totalImages: Number(allTimeStats.totalImages) || 0,
    totalCostCents: Number(allTimeStats.totalCostCents) || 0,
    imagesThisMonth: Number(monthlyStats.imagesThisMonth) || 0,
    costThisMonthCents: Number(monthlyStats.costThisMonthCents) || 0
  };
}


async getContentScheduleByContentId(contentId: string): Promise<ContentSchedule | undefined> {
  const [schedule] = await db
    .select()
    .from(contentSchedule)
    .where(eq(contentSchedule.contentId, contentId));
  return schedule;
}

async getContentScheduleWithDetails(websiteId: string): Promise<Array<ContentSchedule & {
  contentTitle: string;
  contentExcerpt: string | null;
  seoKeywords: string[];
}>> {
  const schedules = await db
    .select({
      // Schedule fields
      id: contentSchedule.id,
      userId: contentSchedule.userId,
      websiteId: contentSchedule.websiteId,
      scheduledDate: contentSchedule.scheduledDate,
      status: contentSchedule.status,
      contentId: contentSchedule.contentId,
      abTestVariant: contentSchedule.abTestVariant,
      createdAt: contentSchedule.createdAt,
      // Content fields
      contentTitle: content.title,
      contentExcerpt: content.excerpt,
      seoKeywords: content.seoKeywords
    })
    .from(contentSchedule)
    .innerJoin(content, eq(contentSchedule.contentId, content.id))
    .where(eq(contentSchedule.websiteId, websiteId))
    .orderBy(desc(contentSchedule.scheduledDate));

  return schedules.map(row => ({
    id: row.id,
    userId: row.userId,
    websiteId: row.websiteId,
    scheduledDate: row.scheduledDate,
    status: row.status,
    contentId: row.contentId,
    abTestVariant: row.abTestVariant,
    createdAt: row.createdAt,
    contentTitle: row.contentTitle,
    contentExcerpt: row.contentExcerpt,
    seoKeywords: row.seoKeywords || []
  }));
}

async updateContentSchedule(id: string, updates: Partial<{
  scheduledDate: Date;
  status: string;
  contentId: string;
  abTestVariant: string | null;
}>): Promise<ContentSchedule | undefined> {
  const [schedule] = await db
    .update(contentSchedule)
    .set({ ...updates })
    .where(eq(contentSchedule.id, id))
    .returning();
  return schedule;
}

async deleteContentSchedule(id: string): Promise<boolean> {
  const result = await db.delete(contentSchedule).where(eq(contentSchedule.id, id));
  return (result.rowCount ?? 0) > 0;
}

async getContentScheduleById(id: string): Promise<ContentSchedule | undefined> {
  const [schedule] = await db
    .select()
    .from(contentSchedule)
    .where(eq(contentSchedule.id, id));
  return schedule;
}

async getUserContentSchedule(userId: string, websiteId?: string): Promise<ContentSchedule[]> {
  if (websiteId) {
    // Verify website ownership first
    const website = await this.getUserWebsite(websiteId, userId);
    if (!website) {
      return [];
    }
    return await this.getContentSchedule(websiteId);
  }
  
  // Get all scheduled content for user's websites
  return await db
    .select()
    .from(contentSchedule)
    .where(eq(contentSchedule.userId, userId))
    .orderBy(contentSchedule.scheduledDate);
}

// Get scheduled content that's ready to be published (for cron jobs)
async getPendingScheduledContent(): Promise<ContentSchedule[]> {
  const now = new Date();
  return await db
    .select()
    .from(contentSchedule)
    .where(
      and(
        eq(contentSchedule.status, 'scheduled'),
        lte(contentSchedule.scheduledDate, now)
      )
    )
    .orderBy(contentSchedule.scheduledDate);
}

// Get upcoming scheduled content (next 7 days)
async getUpcomingScheduledContent(userId: string): Promise<ContentSchedule[]> {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return await db
    .select()
    .from(contentSchedule)
    .where(
      and(
        eq(contentSchedule.userId, userId),
        eq(contentSchedule.status, 'scheduled'),
        gte(contentSchedule.scheduledDate, now),
        lte(contentSchedule.scheduledDate, nextWeek)
      )
    )
    .orderBy(contentSchedule.scheduledDate);
}

// Get unpublished content for a website
async getUnpublishedContent(websiteId: string): Promise<Content[]> {
  return await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.websiteId, websiteId),
        or(
          eq(content.status, 'ready'),
          eq(content.status, 'pending_approval')
        )
      )
    )
    .orderBy(desc(content.createdAt));
}

// Check if content is already scheduled
async isContentScheduled(contentId: string): Promise<boolean> {
  const [schedule] = await db
    .select()
    .from(contentSchedule)
    .where(
      and(
        eq(contentSchedule.contentId, contentId),
        or(
          eq(contentSchedule.status, 'scheduled'),
          eq(contentSchedule.status, 'publishing')
        )
      )
    );
  return !!schedule;
}

// Update the existing createContentSchedule method to work with contentId
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

// Update client report methods - ADD THIS METHOD TO SUPPORT REPORT UPDATES
async updateClientReport(id: string, updates: Partial<{
  data: any;
  insights: any[];
  roiData: any;
  generatedAt: Date;
}>): Promise<ClientReport | undefined> {
  const [report] = await db
    .update(clientReports)
    .set({ ...updates })
    .where(eq(clientReports.id, id))
    .returning();
  return report;
}

// Enhanced content methods
async getAvailableContentForScheduling(websiteId: string, userId: string): Promise<Content[]> {
  // Verify website ownership first
  const website = await this.getUserWebsite(websiteId, userId);
  if (!website) {
    return [];
  }
  
  // Get content that's ready for scheduling (not published and not already scheduled)
  const availableContent = await db
    .select({
      id: content.id,
      userId: content.userId,
      websiteId: content.websiteId,
      title: content.title,
      body: content.body,
      excerpt: content.excerpt,
      metaDescription: content.metaDescription,
      metaTitle: content.metaTitle,
      status: content.status,
      approvedBy: content.approvedBy,
      approvedAt: content.approvedAt,
      rejectionReason: content.rejectionReason,
      aiModel: content.aiModel,
      seoKeywords: content.seoKeywords,
      seoScore: content.seoScore,
      readabilityScore: content.readabilityScore,
      plagiarismScore: content.plagiarismScore,
      brandVoiceScore: content.brandVoiceScore,
      factCheckStatus: content.factCheckStatus,
      eatCompliance: content.eatCompliance,
      tokensUsed: content.tokensUsed,
      costUsd: content.costUsd,
      publishDate: content.publishDate,
      wordpressPostId: content.wordpressPostId,
      wordpressUrl: content.wordpressUrl,
      publishError: content.publishError,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      hasImages: content.hasImages,
      imageCount: content.imageCount,
      imageCostCents: content.imageCostCents
    })
    .from(content)
    .leftJoin(contentSchedule, eq(content.id, contentSchedule.contentId))
    .where(
      and(
        eq(content.websiteId, websiteId),
        eq(content.userId, userId),
        or(
          eq(content.status, 'ready'),
          eq(content.status, 'pending_approval')
        ),
        isNull(contentSchedule.id) // Not already scheduled
      )
    )
    .orderBy(desc(content.createdAt));
  
  return availableContent;
}

// Get dashboard stats for scheduled content
async getSchedulingStats(userId: string): Promise<{
  totalScheduled: number;
  scheduledThisWeek: number;
  scheduledThisMonth: number;
  overdueCount: number;
  publishedFromSchedule: number;
}> {
  const now = new Date();
  const thisWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const [totalScheduled] = await db
    .select({ count: count() })
    .from(contentSchedule)
    .where(
      and(
        eq(contentSchedule.userId, userId),
        eq(contentSchedule.status, 'scheduled')
      )
    );
  
  const [scheduledThisWeek] = await db
    .select({ count: count() })
    .from(contentSchedule)
    .where(
      and(
        eq(contentSchedule.userId, userId),
        eq(contentSchedule.status, 'scheduled'),
        gte(contentSchedule.scheduledDate, now),
        lte(contentSchedule.scheduledDate, thisWeek)
      )
    );
  
  const [scheduledThisMonth] = await db
    .select({ count: count() })
    .from(contentSchedule)
    .where(
      and(
        eq(contentSchedule.userId, userId),
        eq(contentSchedule.status, 'scheduled'),
        gte(contentSchedule.scheduledDate, thisMonthStart),
        lte(contentSchedule.scheduledDate, thisMonthEnd)
      )
    );
  
  const [overdueCount] = await db
    .select({ count: count() })
    .from(contentSchedule)
    .where(
      and(
        eq(contentSchedule.userId, userId),
        eq(contentSchedule.status, 'scheduled'),
        lte(contentSchedule.scheduledDate, now)
      )
    );
  
  const [publishedFromSchedule] = await db
    .select({ count: count() })
    .from(contentSchedule)
    .where(
      and(
        eq(contentSchedule.userId, userId),
        eq(contentSchedule.status, 'published')
      )
    );
  
  return {
    totalScheduled: Number(totalScheduled.count) || 0,
    scheduledThisWeek: Number(scheduledThisWeek.count) || 0,
    scheduledThisMonth: Number(scheduledThisMonth.count) || 0,
    overdueCount: Number(overdueCount.count) || 0,
    publishedFromSchedule: Number(publishedFromSchedule.count) || 0
  };
}

// User Settings Methods
async getUserSettings(userId: string): Promise<UserSettings | undefined> {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return settings;
}

async createUserSettings(userId: string, settingsData: Partial<InsertUserSettings>): Promise<UserSettings> {
  const [settings] = await db
    .insert(userSettings)
    .values({
      userId,
      ...settingsData,
    })
    .returning();
  return settings;
}

async updateUserSettings(userId: string, settingsData: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
  const [settings] = await db
    .update(userSettings)
    .set({ 
      ...settingsData, 
      updatedAt: new Date() 
    })
    .where(eq(userSettings.userId, userId))
    .returning();
  return settings;
}

async deleteUserSettings(userId: string): Promise<boolean> {
  const result = await db
    .delete(userSettings)
    .where(eq(userSettings.userId, userId));
  return (result.rowCount ?? 0) > 0;
}

// Helper method to get or create user settings with defaults
async getOrCreateUserSettings(userId: string): Promise<UserSettings> {
  let settings = await this.getUserSettings(userId);
  
  if (!settings) {
    // Create default settings if none exist
    settings = await this.createUserSettings(userId, {
      profileTimezone: "America/New_York",
      notificationEmailReports: true,
      notificationContentGenerated: true,
      notificationSeoIssues: true,
      notificationSystemAlerts: false,
      automationDefaultAiModel: "gpt-4o",
      automationAutoFixSeoIssues: true,
      automationContentGenerationFrequency: "twice-weekly",
      automationReportGeneration: "weekly",
      securityTwoFactorAuth: false,
      securitySessionTimeout: 24,
      securityAllowApiAccess: true,
    });
  }
  
  return settings;
}

async getUserApiKeys(userId: string): Promise<UserApiKey[]> {
    return await db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId))
      .orderBy(desc(userApiKeys.createdAt));
  }

  async getUserApiKey(userId: string, keyId: string): Promise<UserApiKey | undefined> {
    const [apiKey] = await db
      .select()
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, userId),
          eq(userApiKeys.id, keyId)
        )
      );
    return apiKey;
  }

  async createUserApiKey(userId: string, data: {
    provider: string;
    keyName: string;
    apiKey: string;
  }): Promise<UserApiKey> {
    // Validate API key format
    const formatValidation = apiKeyEncryptionService.validateApiKeyFormat(data.provider, data.apiKey);
    if (!formatValidation.valid) {
      throw new Error(formatValidation.error || 'Invalid API key format');
    }

    // Encrypt the API key
    const encryptedApiKey = apiKeyEncryptionService.encrypt(data.apiKey);
    const maskedKey = apiKeyEncryptionService.createMaskedKey(data.apiKey);

    const [apiKey] = await db
      .insert(userApiKeys)
      .values({
        userId,
        provider: data.provider,
        keyName: data.keyName,
        encryptedApiKey,
        maskedKey,
        validationStatus: 'pending'
      })
      .returning();

    return apiKey;
  }

  async updateUserApiKey(userId: string, keyId: string, updates: Partial<{
    keyName: string;
    isActive: boolean;
    validationStatus: string;
    lastValidated: Date;
    validationError: string;
    usageCount: number;
    lastUsed: Date;
  }>): Promise<UserApiKey | undefined> {
    const [apiKey] = await db
      .update(userApiKeys)
      .set({ 
        ...updates, 
        updatedAt: new Date() 
      })
      .where(
        and(
          eq(userApiKeys.userId, userId),
          eq(userApiKeys.id, keyId)
        )
      )
      .returning();
    return apiKey;
  }

  async deleteUserApiKey(userId: string, keyId: string): Promise<boolean> {
    const result = await db
      .delete(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, userId),
          eq(userApiKeys.id, keyId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  async getDecryptedApiKey(userId: string, keyId: string): Promise<string | null> {
    const apiKey = await this.getUserApiKey(userId, keyId);
    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    try {
      return apiKeyEncryptionService.decrypt(apiKey.encryptedApiKey);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  async validateUserApiKey(userId: string, keyId: string): Promise<{ valid: boolean; error?: string }> {
    const apiKey = await this.getUserApiKey(userId, keyId);
    if (!apiKey) {
      return { valid: false, error: 'API key not found' };
    }

    try {
      const decryptedKey = await this.getDecryptedApiKey(userId, keyId);
      if (!decryptedKey) {
        return { valid: false, error: 'Could not decrypt API key' };
      }

      // Update last validated timestamp
      await this.updateUserApiKey(userId, keyId, {
        lastValidated: new Date(),
        validationStatus: 'valid',
        validationError: null
      });

      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      
      // Update validation status
      await this.updateUserApiKey(userId, keyId, {
        lastValidated: new Date(),
        validationStatus: 'invalid',
        validationError: errorMessage
      });

      return { valid: false, error: errorMessage };
    }
  }

  // Helper method to get API key usage stats
  async getApiKeyUsageStats(userId: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    validKeys: number;
    totalUsage: number;
  }> {
    const keys = await this.getUserApiKeys(userId);
    
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      validKeys: keys.filter(k => k.validationStatus === 'valid').length,
      totalUsage: keys.reduce((sum, k) => sum + (k.usageCount || 0), 0)
    };
  }


  //nadagdag
  // Auto-Schedule Methods for Neon Database
  async getActiveAutoSchedules(): Promise<AutoSchedule[]> {
    try {
      const schedules = await db
        .select()
        .from(autoSchedules)
        .where(
          and(
            eq(autoSchedules.isActive, true),
            isNull(autoSchedules.deletedAt)
          )
        )
        .orderBy(desc(autoSchedules.createdAt));
      
      return schedules.map(schedule => ({
        ...schedule,
        topics: schedule.topics || [],
        customDays: schedule.customDays || [],
        publishDelay: schedule.publishDelay || 0,
        topicRotation: schedule.topicRotation || 'sequential',
        nextTopicIndex: schedule.nextTopicIndex || 0,
        maxDailyCost: schedule.maxDailyCost || 10,
        maxMonthlyPosts: schedule.maxMonthlyPosts || 30,
        costToday: schedule.costToday || 0,
        postsThisMonth: schedule.postsThisMonth || 0,
      }));
    } catch (error) {
      console.error('Error fetching active auto-schedules:', error);
      return [];
    }
  }

// In storage/index.ts, update the updateAutoSchedule method (around line 1263)

  //nadagdag - Fixed to ensure numeric values are properly handled
//nadagdag - Fixed to ensure numeric values are properly handled
  async updateAutoSchedule(scheduleId: string, updates: any): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };
      
      if (updates.lastRun !== undefined) {
        updateData.lastRun = updates.lastRun;
      }
      
      if (updates.postsThisMonth !== undefined) {
        // Ensure it's a number
        const posts = typeof updates.postsThisMonth === 'string' 
          ? parseInt(updates.postsThisMonth) 
          : updates.postsThisMonth;
        updateData.postsThisMonth = posts || 0;
      }
      
      if (updates.costToday !== undefined) {
        // CRITICAL FIX: Ensure costToday is a valid number
        let cost = updates.costToday;
        
        // Handle if it's already a malformed string like "0.000.051885"
        if (typeof cost === 'string' && cost.includes('.') && cost.split('.').length > 2) {
          // Extract the last valid decimal number
          const parts = cost.split('.');
          cost = parseFloat(`0.${parts[parts.length - 1]}`);
        } else {
          // Normal parsing
          cost = parseFloat(cost);
        }
        
        if (isNaN(cost)) {
          console.error('Invalid costToday value:', updates.costToday);
          updateData.costToday = 0;
        } else {
          updateData.costToday = cost;
        }
        
        console.log('Cost update:', {
          original: updates.costToday,
          parsed: cost,
          final: updateData.costToday
        });
      }
      
      if (updates.nextTopicIndex !== undefined) {
        const index = typeof updates.nextTopicIndex === 'string' 
          ? parseInt(updates.nextTopicIndex) 
          : updates.nextTopicIndex;
        updateData.nextTopicIndex = index || 0;
      }

      console.log('Updating auto-schedule:', {
        scheduleId,
        updates: updateData
      });

      await db
        .update(autoSchedules)
        .set(updateData)
        .where(eq(autoSchedules.id, scheduleId));
        
      console.log('✅ Auto-schedule updated successfully');
    } catch (error) {
      console.error('Error updating auto-schedule:', error);
      throw error;
    }
  }

  async resetAutoScheduleDailyCosts(): Promise<void> {
    try {
      await db
        .update(autoSchedules)
        .set({ 
          costToday: 0,
          updatedAt: new Date()
        })
        .where(eq(autoSchedules.isActive, true));
      
      console.log('✅ Daily costs reset for all active auto-schedules');
    } catch (error) {
      console.error('Error resetting daily costs:', error);
      throw error;
    }
  }

  async resetAutoScheduleMonthlyCounts(): Promise<void> {
    try {
      await db
        .update(autoSchedules)
        .set({ 
          postsThisMonth: 0,
          updatedAt: new Date()
        })
        .where(eq(autoSchedules.isActive, true));
      
      console.log('✅ Monthly post counts reset for all active auto-schedules');
    } catch (error) {
      console.error('Error resetting monthly counts:', error);
      throw error;
    }
  }

  // Additional auto-schedule methods
// Update this method in your storage file (around line 1309)

async createAutoSchedule(schedule: InsertAutoSchedule & { userId: string }): Promise<AutoSchedule> {
  try {
    // Manually generate the UUID
    const scheduleData = {
      id: randomUUID(), // Generate UUID here
      userId: schedule.userId,
      websiteId: schedule.websiteId,
      name: schedule.name,
      frequency: schedule.frequency,
      timeOfDay: schedule.timeOfDay,
      customDays: schedule.customDays || [],
      topics: schedule.topics || [],
      keywords: schedule.keywords || null,
      tone: schedule.tone || 'professional',
      wordCount: schedule.wordCount || 800,
      brandVoice: schedule.brandVoice || null,
      targetAudience: schedule.targetAudience || null,
      eatCompliance: schedule.eatCompliance || false,
      aiProvider: schedule.aiProvider || 'openai',
      includeImages: schedule.includeImages || false,
      imageCount: schedule.imageCount || 1,
      imageStyle: schedule.imageStyle || 'natural',
      seoOptimized: schedule.seoOptimized !== false,
      autoPublish: schedule.autoPublish || false,
      publishDelay: schedule.publishDelay || 0,
      topicRotation: schedule.topicRotation || 'random',
      nextTopicIndex: schedule.nextTopicIndex || 0,
      maxDailyCost: schedule.maxDailyCost || 5.00,
      maxMonthlyPosts: schedule.maxMonthlyPosts || 30,
      costToday: schedule.costToday || 0,
      postsThisMonth: schedule.postsThisMonth || 0,
      lastRun: schedule.lastRun || null,
      isActive: schedule.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [newSchedule] = await db
      .insert(autoSchedules)
      .values(scheduleData)
      .returning();
    
    console.log('Auto-schedule created successfully:', newSchedule.id);
    return newSchedule;
  } catch (error) {
    console.error('Error creating auto-schedule:', error);
    throw error;
  }
}
  async getAutoSchedule(scheduleId: string): Promise<AutoSchedule | undefined> {
    try {
      const [schedule] = await db
        .select()
        .from(autoSchedules)
        .where(eq(autoSchedules.id, scheduleId));
      
      return schedule;
    } catch (error) {
      console.error('Error fetching auto-schedule:', error);
      return undefined;
    }
  }

  async deleteAutoSchedule(scheduleId: string): Promise<boolean> {
    try {
      // Soft delete
      await db
        .update(autoSchedules)
        .set({ 
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(autoSchedules.id, scheduleId));
      
      return true;
    } catch (error) {
      console.error('Error deleting auto-schedule:', error);
      return false;
    }
  }

  async getUserAutoSchedules(userId: string): Promise<AutoSchedule[]> {
    try {
      const schedules = await db
        .select()
        .from(autoSchedules)
        .where(
          and(
            eq(autoSchedules.userId, userId),
            isNull(autoSchedules.deletedAt)
          )
        )
        .orderBy(desc(autoSchedules.createdAt));
      
      return schedules;
    } catch (error) {
      console.error('Error fetching user auto-schedules:', error);
      return [];
    }
  }

  // Note: createContentSchedule and createActivityLog already exist in your code
  



  //seo tracking
  async createSeoIssue(issue: InsertSeoIssue): Promise<SeoIssue> {
    const [newIssue] = await db
      .insert(seoIssues)
      .values({
        ...issue,
        status: issue.status || 'open',
        priority: issue.priority || 5,
        affectedPages: issue.affectedPages || 1,
        autoFixAvailable: issue.autoFixAvailable || false,
      })
      .returning();
    return newIssue;
  }

  async updateSeoIssueStatus(
    issueId: string,
    updates: Partial<{
      status: SeoIssueStatus;
      fixMethod: SeoIssueFixMethod;
      fixedBy: string;
      fixDescription: string;
      verificationStatus: SeoIssueVerificationStatus;
      priority: number;
      metadata: any;
    }>
  ): Promise<SeoIssue | undefined> {
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };

    // Set timestamps based on status changes
    if (updates.status === 'fixed') {
      updateData.fixedAt = new Date();
      updateData.resolvedAt = new Date();
      if (!updates.fixMethod) {
        updateData.fixMethod = 'manual';
      }
    }

    if (updates.verificationStatus === 'verified' || updates.verificationStatus === 'failed') {
      updateData.verifiedAt = new Date();
    }

    const [issue] = await db
      .update(seoIssues)
      .set(updateData)
      .where(eq(seoIssues.id, issueId))
      .returning();
    return issue;
  }

  async getSeoIssuesByWebsite(
    websiteId: string,
    filters?: {
      status?: SeoIssueStatus;
      severity?: SeoIssueSeverity;
      category?: string;
      assignedTo?: string;
    }
  ): Promise<SeoIssue[]> {
    let query = db
      .select()
      .from(seoIssues)
      .where(eq(seoIssues.websiteId, websiteId));

    if (filters?.status) {
      query = query.where(eq(seoIssues.status, filters.status));
    }

    if (filters?.severity) {
      query = query.where(eq(seoIssues.severity, filters.severity));
    }

    if (filters?.category) {
      query = query.where(eq(seoIssues.issueCategory, filters.category));
    }

    return query.orderBy(desc(seoIssues.priority), desc(seoIssues.lastDetected));
  }

  async getSeoIssueById(issueId: string): Promise<SeoIssue | undefined> {
    const [issue] = await db
      .select()
      .from(seoIssues)
      .where(eq(seoIssues.id, issueId));
    return issue;
  }

  async upsertSeoIssue(
    websiteId: string,
    userId: string,
    seoReportId: string,
    issueData: any
  ): Promise<SeoIssue> {
    const issueHash = issueData.metadata?.issueHash;
    
    if (!issueHash) {
      // Create new issue
      return this.createSeoIssue({
        userId,
        websiteId,
        seoReportId,
        issueType: issueData.issueType,
        issueCategory: issueData.issueCategory,
        severity: issueData.severity,
        title: issueData.title,
        description: issueData.description,
        affectedElement: issueData.affectedElement,
        affectedPages: issueData.affectedPages,
        autoFixAvailable: issueData.autoFixAvailable,
        metadata: issueData.metadata,
        priority: issueData.priority,
      });
    }

    // Check if issue already exists
    const [existingIssue] = await db
      .select()
      .from(seoIssues)
      .where(
        and(
          eq(seoIssues.websiteId, websiteId),
          sql`${seoIssues.metadata}->>'issueHash' = ${issueHash}`
        )
      );

    if (existingIssue) {
      // Update existing issue
      const [updated] = await db
        .update(seoIssues)
        .set({
          seoReportId,
          lastDetected: new Date(),
          occurrenceCount: existingIssue.occurrenceCount + 1,
          affectedPages: issueData.affectedPages,
          priority: issueData.priority,
          metadata: {
            ...existingIssue.metadata,
            ...issueData.metadata,
          },
          updatedAt: new Date(),
        })
        .where(eq(seoIssues.id, existingIssue.id))
        .returning();
      return updated;
    } else {
      // Create new issue
      return this.createSeoIssue({
        userId,
        websiteId,
        seoReportId,
        issueType: issueData.issueType,
        issueCategory: issueData.issueCategory,
        severity: issueData.severity,
        title: issueData.title,
        description: issueData.description,
        affectedElement: issueData.affectedElement,
        affectedPages: issueData.affectedPages,
        autoFixAvailable: issueData.autoFixAvailable,
        metadata: issueData.metadata,
        priority: issueData.priority,
      });
    }
  }

  async getSeoIssueStats(websiteId: string): Promise<{
    total: number;
    byStatus: Record<SeoIssueStatus, number>;
    bySeverity: Record<SeoIssueSeverity, number>;
    byCategory: Record<string, number>;
    autoFixableCount: number;
    averagePriority: number;
  }> {
    const issues = await this.getSeoIssuesByWebsite(websiteId);
    
    const byStatus = {
      open: 0,
      in_progress: 0,
      fixed: 0,
      ignored: 0,
      needs_verification: 0,
    } as Record<SeoIssueStatus, number>;

    const bySeverity = {
      critical: 0,
      warning: 0,
      info: 0,
    } as Record<SeoIssueSeverity, number>;

    const byCategory: Record<string, number> = {};
    let autoFixableCount = 0;
    let totalPriority = 0;

    issues.forEach(issue => {
      byStatus[issue.status]++;
      bySeverity[issue.severity]++;
      byCategory[issue.issueCategory] = (byCategory[issue.issueCategory] || 0) + 1;
      
      if (issue.autoFixAvailable) autoFixableCount++;
      totalPriority += issue.priority;
    });

    return {
      total: issues.length,
      byStatus,
      bySeverity,
      byCategory,
      autoFixableCount,
      averagePriority: issues.length > 0 ? Math.round(totalPriority / issues.length) : 0,
    };
  }
}

export const storage = new DatabaseStorage();
