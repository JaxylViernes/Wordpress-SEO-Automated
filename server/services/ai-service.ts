import OpenAI from "openai";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-default-key" 
});

// OpenAI pricing per 1K tokens (as of 2024)
const PRICING = {
  "gpt-4o": {
    input: 0.005,  // $0.005 per 1K input tokens
    output: 0.015  // $0.015 per 1K output tokens
  },
  "gpt-4": {
    input: 0.03,
    output: 0.06
  }
};

export interface ContentGenerationRequest {
  websiteId: string;
  topic: string;
  keywords: string[];
  tone: "professional" | "casual" | "friendly" | "authoritative" | "technical" | "warm";
  wordCount: number;
  seoOptimized: boolean;
  brandVoice?: string;
  targetAudience?: string;
  eatCompliance?: boolean; // E-E-A-T compliance for YMYL content
}

export interface ContentGenerationResult {
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  metaTitle: string;
  keywords: string[];
  seoScore: number;
  readabilityScore: number;
  brandVoiceScore: number;
  eatCompliance: boolean;
  tokensUsed: number;
  costUsd: number;
  qualityChecks: {
    plagiarismRisk: "low" | "medium" | "high";
    factualAccuracy: "verified" | "needs_review" | "questionable";
    brandAlignment: "excellent" | "good" | "needs_improvement";
  };
}

export class AIService {
  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    try {
      const prompt = this.buildContentPrompt(request);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert content writer and SEO specialist. Create high-quality, engaging content that is optimized for search engines. Respond with JSON in the format: { 'title': string, 'content': string, 'metaDescription': string, 'keywords': string[], 'seoScore': number }"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        title: result.title || "Generated Content",
        content: result.content || "",
        metaDescription: result.metaDescription || "",
        keywords: result.keywords || request.keywords,
        seoScore: Math.max(70, Math.min(100, result.seoScore || 85))
      };
    } catch (error) {
      console.error("AI content generation failed:", error);
      throw new Error("Failed to generate content using AI. Please check your API configuration.");
    }
  }

  async optimizeContent(content: string, keywords: string[]): Promise<{
    optimizedContent: string;
    suggestions: string[];
    seoScore: number;
  }> {
    try {
      const prompt = `Optimize the following content for SEO using these keywords: ${keywords.join(", ")}. 
      
      Content: ${content}
      
      Provide suggestions for improvement and return optimized content with an SEO score.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an SEO optimization expert. Analyze and improve content for better search engine rankings. Respond with JSON in the format: { 'optimizedContent': string, 'suggestions': string[], 'seoScore': number }"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        optimizedContent: result.optimizedContent || content,
        suggestions: result.suggestions || [],
        seoScore: Math.max(50, Math.min(100, result.seoScore || 75))
      };
    } catch (error) {
      console.error("Content optimization failed:", error);
      throw new Error("Failed to optimize content. Please try again.");
    }
  }

  private buildContentPrompt(request: ContentGenerationRequest): string {
    return `Create a comprehensive blog post about "${request.topic}" with the following requirements:
    
    - Target keywords: ${request.keywords.join(", ")}
    - Tone: ${request.tone}
    - Word count: approximately ${request.wordCount} words
    - SEO optimized: ${request.seoOptimized ? "Yes" : "No"}
    
    The content should be engaging, informative, and well-structured with proper headings. Include a compelling title and meta description optimized for search engines.
    
    Please ensure the content is original, valuable to readers, and follows SEO best practices including proper keyword usage, readability, and structure.`;
  }
}

export const aiService = new AIService();
