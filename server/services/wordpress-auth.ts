import crypto from 'crypto';

// Encryption utilities for securing WordPress Application Passwords
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_SECRET || crypto.randomBytes(32).toString('hex');

interface WordPressAuth {
  applicationName: string;
  applicationPassword: string;
  username: string;
}

interface EncryptedCredentials {
  encrypted: string;
  iv: string;
  tag: string;
}

export class WordPressAuthService {
  private getKey(): Buffer {
    return Buffer.from(SECRET_KEY.slice(0, 64), 'hex');
  }

  /**
   * Encrypt WordPress Application Password
   */
  encryptCredentials(credentials: WordPressAuth): EncryptedCredentials {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, this.getKey());
    cipher.setAAD(Buffer.from(credentials.applicationName));

    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt WordPress Application Password
   */
  decryptCredentials(encryptedData: EncryptedCredentials, applicationName: string): WordPressAuth {
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, this.getKey());
    decipher.setAAD(Buffer.from(applicationName));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Test WordPress connection using Application Password
   */
  async testConnection(url: string, credentials: WordPressAuth): Promise<{
    success: boolean;
    error?: string;
    userInfo?: any;
  }> {
    try {
      const authString = Buffer.from(
        `${credentials.username}:${credentials.applicationPassword}`
      ).toString('base64');

      const response = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const userInfo = await response.json();
      return {
        success: true,
        userInfo: {
          id: userInfo.id,
          username: userInfo.username,
          displayName: userInfo.name,
          email: userInfo.email,
          roles: userInfo.roles,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create a draft post in WordPress
   */
  async createDraftPost(
    url: string, 
    credentials: WordPressAuth, 
    postData: {
      title: string;
      content: string;
      excerpt?: string;
      meta_description?: string;
      seo_keywords?: string[];
    }
  ): Promise<{ success: boolean; postId?: number; error?: string }> {
    try {
      const authString = Buffer.from(
        `${credentials.username}:${credentials.applicationPassword}`
      ).toString('base64');

      const response = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: postData.title,
          content: postData.content,
          excerpt: postData.excerpt || '',
          status: 'draft',
          meta: {
            _yoast_wpseo_metadesc: postData.meta_description,
            _yoast_wpseo_focuskw: postData.seo_keywords?.join(', '),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const post = await response.json();
      return {
        success: true,
        postId: post.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Publish a draft post
   */
  async publishPost(
    url: string, 
    credentials: WordPressAuth, 
    postId: number,
    publishDate?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const authString = Buffer.from(
        `${credentials.username}:${credentials.applicationPassword}`
      ).toString('base64');

      const response = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'publish',
          date: publishDate ? publishDate.toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create WordPress Application Password guide
   */
  getApplicationPasswordInstructions(): {
    title: string;
    steps: string[];
    securityNote: string;
  } {
    return {
      title: "How to Create WordPress Application Password",
      steps: [
        "1. Log into your WordPress admin dashboard",
        "2. Go to Users → Your Profile (or Users → All Users → Edit your user)",
        "3. Scroll down to the 'Application Passwords' section",
        "4. Enter a name like 'AI Content Manager' in the 'New Application Password Name' field",
        "5. Click 'Add New Application Password'",
        "6. Copy the generated password immediately (it won't be shown again)",
        "7. Use this password along with your WordPress username in the form below"
      ],
      securityNote: "Application Passwords are more secure than regular passwords and can be revoked individually without changing your main password."
    };
  }
}

export const wordPressAuthService = new WordPressAuthService();