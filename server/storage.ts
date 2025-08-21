import { 
  type User, 
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
  type InsertClientReport
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private websites: Map<string, Website>;
  private content: Map<string, Content>;
  private seoReports: Map<string, SeoReport>;
  private activityLogs: Map<string, ActivityLog>;
  private clientReports: Map<string, ClientReport>;

  constructor() {
    this.users = new Map();
    this.websites = new Map();
    this.content = new Map();
    this.seoReports = new Map();
    this.activityLogs = new Map();
    this.clientReports = new Map();
    
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample websites
    const website1: Website = {
      id: "1",
      name: "TechBlog.com",
      url: "https://techblog.com",
      wpUsername: "admin",
      wpPassword: "password123",
      aiModel: "gpt-4o",
      autoPosting: true,
      status: "active",
      seoScore: 92,
      contentCount: 24,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const website2: Website = {
      id: "2",
      name: "E-Commerce.store",
      url: "https://e-commerce.store",
      wpUsername: "admin",
      wpPassword: "password123",
      aiModel: "gpt-4o",
      autoPosting: true,
      status: "processing",
      seoScore: 78,
      contentCount: 18,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const website3: Website = {
      id: "3",
      name: "RestaurantSite.com",
      url: "https://restaurantsite.com",
      wpUsername: "admin",
      wpPassword: "password123",
      aiModel: "claude-3",
      autoPosting: true,
      status: "issues",
      seoScore: 65,
      contentCount: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.websites.set("1", website1);
    this.websites.set("2", website2);
    this.websites.set("3", website3);

    // Sample activity logs
    const activities = [
      {
        id: "1",
        websiteId: "1",
        type: "content_published",
        description: 'Content published: "10 SEO Tips for 2024"',
        metadata: { contentId: "1", title: "10 SEO Tips for 2024" },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: "2",
        websiteId: "2",
        type: "seo_analysis",
        description: "SEO analysis completed",
        metadata: { score: 78, previousScore: 76 },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: "3",
        websiteId: "3",
        type: "content_scheduled",
        description: "Content scheduled for tomorrow",
        metadata: { title: "Local SEO for Restaurants", publishDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
      {
        id: "4",
        websiteId: "3",
        type: "seo_issue",
        description: "SEO issue detected",
        metadata: { issue: "Missing meta descriptions", severity: "high" },
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      },
    ];

    activities.forEach(activity => {
      this.activityLogs.set(activity.id, activity as ActivityLog);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Websites
  async getWebsites(): Promise<Website[]> {
    return Array.from(this.websites.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getWebsite(id: string): Promise<Website | undefined> {
    return this.websites.get(id);
  }

  async createWebsite(insertWebsite: InsertWebsite): Promise<Website> {
    const id = randomUUID();
    const website: Website = {
      ...insertWebsite,
      id,
      status: "active",
      seoScore: 0,
      contentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.websites.set(id, website);
    
    // Log activity
    await this.createActivityLog({
      websiteId: id,
      type: "website_connected",
      description: `Website connected: ${website.name}`,
      metadata: { url: website.url },
    });

    return website;
  }

  async updateWebsite(id: string, updates: Partial<Website>): Promise<Website | undefined> {
    const website = this.websites.get(id);
    if (!website) return undefined;

    const updated = { ...website, ...updates, updatedAt: new Date() };
    this.websites.set(id, updated);
    return updated;
  }

  async deleteWebsite(id: string): Promise<boolean> {
    return this.websites.delete(id);
  }

  // Content
  async getContentByWebsite(websiteId: string): Promise<Content[]> {
    return Array.from(this.content.values())
      .filter(c => c.websiteId === websiteId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getContent(id: string): Promise<Content | undefined> {
    return this.content.get(id);
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const id = randomUUID();
    const content: Content = {
      ...insertContent,
      id,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.content.set(id, content);
    return content;
  }

  async updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined> {
    const content = this.content.get(id);
    if (!content) return undefined;

    const updated = { ...content, ...updates, updatedAt: new Date() };
    this.content.set(id, updated);
    return updated;
  }

  // SEO Reports
  async getSeoReportsByWebsite(websiteId: string): Promise<SeoReport[]> {
    return Array.from(this.seoReports.values())
      .filter(r => r.websiteId === websiteId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getLatestSeoReport(websiteId: string): Promise<SeoReport | undefined> {
    const reports = await this.getSeoReportsByWebsite(websiteId);
    return reports[0];
  }

  async createSeoReport(insertReport: InsertSeoReport): Promise<SeoReport> {
    const id = randomUUID();
    const report: SeoReport = {
      ...insertReport,
      id,
      createdAt: new Date(),
    };
    this.seoReports.set(id, report);
    return report;
  }

  // Activity Logs
  async getActivityLogs(websiteId?: string): Promise<ActivityLog[]> {
    let logs = Array.from(this.activityLogs.values());
    
    if (websiteId) {
      logs = logs.filter(log => log.websiteId === websiteId);
    }
    
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = {
      ...insertLog,
      id,
      createdAt: new Date(),
    };
    this.activityLogs.set(id, log);
    return log;
  }

  // Client Reports
  async getClientReports(websiteId: string): Promise<ClientReport[]> {
    return Array.from(this.clientReports.values())
      .filter(r => r.websiteId === websiteId)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  async createClientReport(insertReport: InsertClientReport): Promise<ClientReport> {
    const id = randomUUID();
    const report: ClientReport = {
      ...insertReport,
      id,
      generatedAt: new Date(),
    };
    this.clientReports.set(id, report);
    return report;
  }
}

export const storage = new MemStorage();
