import * as cheerio from "cheerio";

// ============================================
// SCHEMA GENERATOR SERVICE
// ============================================

interface SchemaConfig {
  siteName: string;
  siteUrl: string;
  logoUrl?: string;
  organizationName?: string;
}

class SchemaGenerator {
  private config: SchemaConfig;

  constructor(config: SchemaConfig) {
    this.config = config;
  }

  /**
   * Generate Article schema for blog posts
   */
  generateArticleSchema(content: any, author?: string): object {
    const title = this.cleanText(content.title?.rendered || content.title || "");
    const description = this.cleanText(
      content.excerpt?.rendered || content.excerpt || ""
    );
    const publishedDate = content.date || new Date().toISOString();
    const modifiedDate = content.modified || publishedDate;
    const imageUrl = this.extractFeaturedImage(content);

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: description.substring(0, 200),
      image: imageUrl || `${this.config.siteUrl}/default-image.jpg`,
      datePublished: publishedDate,
      dateModified: modifiedDate,
      author: {
        "@type": "Person",
        name: author || "Site Author",
      },
      publisher: {
        "@type": "Organization",
        name: this.config.organizationName || this.config.siteName,
        logo: {
          "@type": "ImageObject",
          url: this.config.logoUrl || `${this.config.siteUrl}/logo.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": content.link || this.config.siteUrl,
      },
    };
  }

  /**
   * Generate FAQ schema from content
   */
  generateFAQSchema(content: any): object | null {
    const html = content.content?.rendered || content.content || "";
    const $ = cheerio.load(html);

    const questions: Array<{ question: string; answer: string }> = [];

    // Method 1: Look for H2/H3 questions followed by paragraphs
    $("h2, h3").each((_, heading) => {
      const headingText = $(heading).text().trim();
      if (headingText.includes("?")) {
        const answer = $(heading).next("p").text().trim();
        if (answer) {
          questions.push({ question: headingText, answer });
        }
      }
    });

    // Method 2: Look for <dt> and <dd> pairs
    $("dt").each((_, dt) => {
      const question = $(dt).text().trim();
      const answer = $(dt).next("dd").text().trim();
      if (question && answer) {
        questions.push({ question, answer });
      }
    });

    if (questions.length < 2) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: q.answer,
        },
      })),
    };
  }

  /**
   * Generate HowTo schema for tutorials
   */
  generateHowToSchema(content: any): object | null {
    const html = content.content?.rendered || content.content || "";
    const $ = cheerio.load(html);
    const title = this.cleanText(content.title?.rendered || content.title || "");

    // Look for ordered lists or numbered steps
    const steps: Array<{ name: string; text: string }> = [];

    $("ol li").each((i, li) => {
      const stepText = $(li).text().trim();
      if (stepText) {
        steps.push({
          name: `Step ${i + 1}`,
          text: stepText,
        });
      }
    });

    // Alternative: Look for H2/H3 with "Step" in them
    if (steps.length === 0) {
      $("h2, h3").each((_, heading) => {
        const headingText = $(heading).text();
        if (/step\s+\d+/i.test(headingText)) {
          const stepContent = $(heading).next("p").text().trim();
          steps.push({
            name: headingText,
            text: stepContent,
          });
        }
      });
    }

    if (steps.length < 2) return null;

    const imageUrl = this.extractFeaturedImage(content);

    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: title,
      description: this.cleanText(
        content.excerpt?.rendered || content.excerpt || ""
      ).substring(0, 200),
      image: imageUrl ? { "@type": "ImageObject", url: imageUrl } : undefined,
      step: steps.map((step) => ({
        "@type": "HowToStep",
        name: step.name,
        text: step.text,
      })),
    };
  }

  /**
   * Generate Breadcrumb schema
   */
  generateBreadcrumbSchema(url: string, title: string): object {
    const urlParts = url.replace(this.config.siteUrl, "").split("/").filter(Boolean);
    
    const items = [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: this.config.siteUrl,
      },
    ];

    let currentUrl = this.config.siteUrl;
    urlParts.forEach((part, index) => {
      currentUrl += `/${part}`;
      items.push({
        "@type": "ListItem",
        position: index + 2,
        name: index === urlParts.length - 1 ? title : this.formatSlug(part),
        item: currentUrl,
      });
    });

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    };
  }

  /**
   * Inject schema into content
   */
  injectSchemaIntoContent(html: string, schemas: object[]): string {
    const $ = cheerio.load(html, { decodeEntities: false });

    schemas.forEach((schema) => {
      const schemaScript = `<script type="application/ld+json">${JSON.stringify(
        schema,
        null,
        2
      )}</script>`;
      
      // Try to insert at the end of content
      if ($("body").length) {
        $("body").append(schemaScript);
      } else {
        $.root().append(schemaScript);
      }
    });

    return $.html();
  }

  /**
   * Helper: Extract featured image from content
   */
  private extractFeaturedImage(content: any): string | null {
    // Try featured_media first
    if (content.featured_media_url) {
      return content.featured_media_url;
    }

    // Extract first image from content
    const html = content.content?.rendered || content.content || "";
    const $ = cheerio.load(html);
    const firstImg = $("img").first().attr("src");

    return firstImg || null;
  }

  /**
   * Helper: Clean HTML from text
   */
  private cleanText(text: string): string {
    return text.replace(/<[^>]*>/g, "").trim();
  }

  /**
   * Helper: Format URL slug to readable title
   */
  private formatSlug(slug: string): string {
    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Detect content type and generate appropriate schema
   */
  detectAndGenerateSchema(content: any, author?: string): object[] {
    const schemas: object[] = [];
    const title = content.title?.rendered || content.title || "";
    const contentHtml = content.content?.rendered || content.content || "";

    // Always add Article schema for posts
    if (content.type === "post" || !content.type) {
      schemas.push(this.generateArticleSchema(content, author));
    }

    // Add FAQ schema if questions detected
    const faqSchema = this.generateFAQSchema(content);
    if (faqSchema) schemas.push(faqSchema);

    // Add HowTo schema if steps detected
    const howToSchema = this.generateHowToSchema(content);
    if (howToSchema) schemas.push(howToSchema);

    // Add Breadcrumb schema
    if (content.link) {
      schemas.push(this.generateBreadcrumbSchema(content.link, title));
    }

    return schemas;
  }
}

export { SchemaGenerator, SchemaConfig };