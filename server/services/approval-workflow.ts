import { storage } from "../storage";
import { wordPressAuthService } from "./wordpress-auth";

interface ContentApprovalRequest {
  contentId: string;
  reviewerId: string;
  decision: "approved" | "rejected" | "needs_revision";
  feedback?: string;
  qualityScore?: number;
}

interface PublishingOptions {
  publishNow?: boolean;
  scheduledDate?: Date;
  performBackup?: boolean;
}

export class ApprovalWorkflowService {
  /**
   * Submit content for approval
   */
  async submitForApproval(contentId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const content = await storage.getContent(contentId);
      if (!content) {
        return { success: false, message: "Content not found" };
      }

      await storage.updateContent(contentId, {
        status: "pending_approval",
      });

      await storage.createActivityLog({
        websiteId: content.websiteId,
        type: "content_submitted_for_approval",
        description: `Content submitted for approval: "${content.title}"`,
        metadata: { contentId, previousStatus: content.status },
      });

      return {
        success: true,
        message: "Content submitted for approval successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit for approval",
      };
    }
  }

  /**
   * Process content approval decision
   */
  async processApproval(request: ContentApprovalRequest): Promise<{
    success: boolean;
    message: string;
    contentStatus?: string;
  }> {
    try {
      const content = await storage.getContent(request.contentId);
      if (!content) {
        return { success: false, message: "Content not found" };
      }

      // Create approval record
      await storage.createContentApproval({
        contentId: request.contentId,
        reviewerId: request.reviewerId,
        status: request.decision,
        feedback: request.feedback,
        qualityScore: request.qualityScore,
      });

      // Update content status based on decision
      let newStatus: string;
      switch (request.decision) {
        case "approved":
          newStatus = "approved";
          break;
        case "rejected":
          newStatus = "rejected";
          break;
        case "needs_revision":
          newStatus = "needs_revision";
          break;
        default:
          newStatus = "pending_approval";
      }

      await storage.updateContent(request.contentId, {
        status: newStatus,
        approvedBy:
          request.decision === "approved" ? request.reviewerId : undefined,
        approvedAt: request.decision === "approved" ? new Date() : undefined,
        rejectionReason:
          request.decision === "rejected"
            ? request.feedback || undefined
            : undefined,
      });

      // Log the approval decision
      await storage.createActivityLog({
        websiteId: content.websiteId,
        type: `content_${request.decision}`,
        description: `Content ${request.decision}: "${content.title}"`,
        metadata: {
          contentId: request.contentId,
          reviewerId: request.reviewerId,
          qualityScore: request.qualityScore,
          feedback: request.feedback,
        },
      });

      return {
        success: true,
        message: `Content ${request.decision} successfully`,
        contentStatus: newStatus,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to process approval",
      };
    }
  }

  /**
   * Publish approved content to WordPress
   */
  async publishApprovedContent(
    contentId: string,
    options: PublishingOptions = {}
  ): Promise<{
    success: boolean;
    message: string;
    wordpressPostId?: number;
  }> {
    try {
      const content = await storage.getContent(contentId);
      if (!content) {
        return { success: false, message: "Content not found" };
      }

      if (content.status !== "approved") {
        return {
          success: false,
          message: "Content must be approved before publishing",
        };
      }

      const website = await storage.getWebsite(content.websiteId);
      if (!website) {
        return { success: false, message: "Website not found" };
      }

      // Create backup if requested
      if (options.performBackup) {
        await this.createContentBackup(contentId, website.id);
      }

      // Decrypt WordPress credentials
      const credentials = wordPressAuthService.decryptCredentials(
        {
          encrypted: website.wpApplicationPassword,
          iv: "", // Would need to store IV separately in real implementation
          tag: "",
        },
        website.wpApplicationName
      );

      // Create draft post first
      const draftResult = await wordPressAuthService.createDraftPost(
        website.url,
        credentials,
        {
          title: content.title,
          content: content.body,
          excerpt: content.excerpt,
          meta_description: content.metaDescription,
          seo_keywords: content.seoKeywords,
        }
      );

      if (!draftResult.success || !draftResult.postId) {
        return {
          success: false,
          message: draftResult.error || "Failed to create draft",
        };
      }

      // Publish the post
      let publishResult;
      if (options.publishNow) {
        publishResult = await wordPressAuthService.publishPost(
          website.url,
          credentials,
          draftResult.postId,
          options.scheduledDate
        );
      } else {
        publishResult = { success: true }; // Keep as draft
      }

      if (!publishResult.success) {
        return {
          success: false,
          message: publishResult.error || "Failed to publish post",
        };
      }

      // Update content with WordPress post ID and published status
      await storage.updateContent(contentId, {
        status: options.publishNow ? "published" : "scheduled",
        publishDate: options.publishNow ? new Date() : options.scheduledDate,
        wordpressPostId: draftResult.postId,
      });

      // Log the publishing activity
      await storage.createActivityLog({
        websiteId: content.websiteId,
        type: options.publishNow ? "content_published" : "content_scheduled",
        description: `Content ${
          options.publishNow ? "published" : "scheduled"
        }: "${content.title}"`,
        metadata: {
          contentId,
          wordpressPostId: draftResult.postId,
          publishDate: options.publishNow ? new Date() : options.scheduledDate,
        },
      });

      return {
        success: true,
        message: `Content ${
          options.publishNow ? "published" : "scheduled"
        } successfully`,
        wordpressPostId: draftResult.postId,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to publish content",
      };
    }
  }

  /**
   * Create content backup before publishing
   */
  private async createContentBackup(
    contentId: string,
    websiteId: string
  ): Promise<void> {
    try {
      const content = await storage.getContent(contentId);
      if (!content) return;

      await storage.createBackup({
        websiteId,
        backupType: "content",
        data: {
          contentId,
          title: content.title,
          body: content.body,
          status: content.status,
          createdAt: content.createdAt,
          backupReason: "pre_publish",
        },
      });
    } catch (error) {
      console.error("Failed to create content backup:", error);
    }
  }

  /**
   * Get all pending approval content
   */
  async getPendingApprovals(): Promise<any[]> {
    try {
      return await storage.getPendingApprovalContent();
    } catch (error) {
      console.error("Failed to get pending approvals:", error);
      return [];
    }
  }

  /**
   * Emergency stop - pause all automation for a website
   */
  async emergencyStop(
    websiteId: string,
    reason: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const website = await storage.updateWebsite(websiteId, {
        status: "suspended",
        autoPosting: false,
      });

      if (!website) {
        return { success: false, message: "Website not found" };
      }

      await storage.createActivityLog({
        websiteId,
        type: "emergency_stop",
        description: `Emergency stop activated: ${reason}`,
        metadata: { reason, timestamp: new Date() },
      });

      await storage.createSecurityAudit({
        websiteId,
        action: "emergency_stop",
        success: true,
        metadata: { reason },
      });

      return {
        success: true,
        message: "Emergency stop activated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to activate emergency stop",
      };
    }
  }
}

export const approvalWorkflowService = new ApprovalWorkflowService();
