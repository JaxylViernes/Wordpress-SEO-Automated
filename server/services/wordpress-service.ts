import { wordPressAuthService } from '../wordpress-auth';

interface WordPressCredentials {
  url: string;
  username: string;
  applicationPassword: string;
}

interface PostData {
  title: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'publish';
  meta?: {
    description?: string;
    title?: string;
  };
}

interface WordPressResponse {
  id: number;
  link: string;
  status: string;
  title?: { rendered: string };
  content?: { rendered: string };
}

export class WordPressService {
  private createAuthHeaders(credentials: WordPressCredentials): Record<string, string> {
    const authString = Buffer.from(
      `${credentials.username}:${credentials.applicationPassword}`
    ).toString('base64');

    return {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'AI-Content-Manager/1.0'
    };
  }

  private normalizeUrl(url: string): string {
    return url.replace(/\/$/, '');
  }

  private async makeWordPressRequest(
    url: string, 
    method: 'GET' | 'POST' | 'PUT', 
    headers: Record<string, string>,
    body?: any
  ): Promise<Response> {
    const requestOptions: RequestInit = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    };

    console.log(`${method} ${url}`, { 
      hasAuth: !!headers.Authorization,
      contentType: headers['Content-Type'],
      bodyKeys: body ? Object.keys(body) : null
    });

    const response = await fetch(url, requestOptions);
    
    // Log response details for debugging
    console.log(`WordPress ${method} Response:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    return response;
  }

  async testConnection(credentials: WordPressCredentials): Promise<{
    success: boolean;
    message?: string;
    userInfo?: any;
  }> {
    try {
      const baseUrl = this.normalizeUrl(credentials.url);
      const headers = this.createAuthHeaders(credentials);
      
      console.log(`Testing WordPress connection: ${baseUrl}/wp-json/wp/v2/users/me`);
      
      const response = await this.makeWordPressRequest(
        `${baseUrl}/wp-json/wp/v2/users/me`,
        'GET',
        headers
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Connection test failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });

        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 401) {
          errorMessage = "Authentication failed. Please check your username and Application Password.";
        } else if (response.status === 403) {
          errorMessage = "Access forbidden. Your user may not have sufficient permissions.";
        } else if (response.status === 404) {
          errorMessage = "WordPress REST API not found. Check if the URL is correct and REST API is enabled.";
        }
        
        return { success: false, message: errorMessage };
      }

      const userInfo = await response.json();
      console.log('WordPress connection successful:', {
        userId: userInfo.id,
        username: userInfo.username,
        roles: userInfo.roles
      });

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
      console.error('WordPress connection test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      return { success: false, message: errorMessage };
    }
  }

  async publishPost(credentials: WordPressCredentials, postData: PostData): Promise<WordPressResponse> {
    try {
      const baseUrl = this.normalizeUrl(credentials.url);
      const headers = this.createAuthHeaders(credentials);
      
      // Prepare the post payload with proper WordPress formatting
      const postPayload = {
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt || '',
        status: postData.status,
        // Add meta fields if provided
        ...(postData.meta && {
          meta: {
            ...(postData.meta.description && { _yoast_wpseo_metadesc: postData.meta.description }),
            ...(postData.meta.title && { _yoast_wpseo_title: postData.meta.title })
          }
        })
      };

      console.log('Publishing to WordPress:', `${baseUrl}/wp-json/wp/v2/posts`);
      console.log('Post payload keys:', Object.keys(postPayload));

      const response = await this.makeWordPressRequest(
        `${baseUrl}/wp-json/wp/v2/posts`,
        'POST',
        headers,
        postPayload
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WordPress publish failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });

        // Try to parse error details
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { message: errorText };
        }

        let errorMessage = `Failed to publish to WordPress`;
        
        if (response.status === 401) {
          errorMessage = "WordPress authentication failed. Check your Application Password.";
        } else if (response.status === 403) {
          errorMessage = "Permission denied. Your user may not have publishing permissions.";
        } else if (response.status === 400) {
          errorMessage = `Invalid post data: ${errorDetails.message || 'Bad request'}`;
        } else if (response.status === 500) {
          errorMessage = "WordPress server error. Check your website's error logs.";
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('WordPress publish successful:', {
        id: result.id,
        status: result.status,
        link: result.link
      });

      return {
        id: result.id,
        link: result.link,
        status: result.status,
        title: result.title,
        content: result.content
      };

    } catch (error) {
      console.error('WordPress publish error:', error);
      
      if (error instanceof Error) {
        throw error; // Re-throw with original message
      }
      
      throw new Error(`Failed to publish to WordPress: ${error}`);
    }
  }

  async updatePost(
    credentials: WordPressCredentials, 
    postId: number, 
    postData: Partial<PostData>
  ): Promise<WordPressResponse> {
    try {
      const baseUrl = this.normalizeUrl(credentials.url);
      const headers = this.createAuthHeaders(credentials);
      
      const updatePayload = {
        ...(postData.title && { title: postData.title }),
        ...(postData.content && { content: postData.content }),
        ...(postData.excerpt && { excerpt: postData.excerpt }),
        ...(postData.status && { status: postData.status }),
        ...(postData.meta && {
          meta: {
            ...(postData.meta.description && { _yoast_wpseo_metadesc: postData.meta.description }),
            ...(postData.meta.title && { _yoast_wpseo_title: postData.meta.title })
          }
        })
      };

      console.log(`Updating WordPress post ${postId}:`, `${baseUrl}/wp-json/wp/v2/posts/${postId}`);

      const response = await this.makeWordPressRequest(
        `${baseUrl}/wp-json/wp/v2/posts/${postId}`,
        'PUT',
        headers,
        updatePayload
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WordPress update failed:', {
          postId,
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });

        let errorMessage = `Failed to update WordPress post ${postId}`;
        
        if (response.status === 401) {
          errorMessage = "WordPress authentication failed. Check your Application Password.";
        } else if (response.status === 403) {
          errorMessage = "Permission denied. You may not have permission to edit this post.";
        } else if (response.status === 404) {
          errorMessage = `WordPress post ${postId} not found.`;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('WordPress update successful:', {
        id: result.id,
        status: result.status,
        link: result.link
      });

      return {
        id: result.id,
        link: result.link,
        status: result.status,
        title: result.title,
        content: result.content
      };

    } catch (error) {
      console.error('WordPress update error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error(`Failed to update WordPress post: ${error}`);
    }
  }

  // Enhanced method to verify user permissions
  async verifyPublishPermissions(credentials: WordPressCredentials): Promise<{
    canPublish: boolean;
    capabilities: string[];
    message: string;
  }> {
    try {
      const connectionTest = await this.testConnection(credentials);
      
      if (!connectionTest.success) {
        return {
          canPublish: false,
          capabilities: [],
          message: connectionTest.message || 'Connection failed'
        };
      }

      const userInfo = connectionTest.userInfo;
      const canPublish = userInfo?.roles?.includes('administrator') || 
                        userInfo?.roles?.includes('editor') || 
                        userInfo?.roles?.includes('author');

      return {
        canPublish,
        capabilities: userInfo?.roles || [],
        message: canPublish 
          ? 'User has publishing permissions' 
          : `User roles (${userInfo?.roles?.join(', ')}) may not include publishing permissions`
      };

    } catch (error) {
      return {
        canPublish: false,
        capabilities: [],
        message: error instanceof Error ? error.message : 'Permission check failed'
      };
    }
  }

  // Test method to create a simple draft post for verification
  async createTestDraft(credentials: WordPressCredentials): Promise<{
    success: boolean;
    postId?: number;
    message: string;
  }> {
    try {
      const testPost: PostData = {
        title: 'Test Post - AI Content Manager',
        content: '<p>This is a test post created by AI Content Manager. You can safely delete this.</p>',
        excerpt: 'Test post to verify WordPress publishing functionality.',
        status: 'draft'
      };

      const result = await this.publishPost(credentials, testPost);
      
      return {
        success: true,
        postId: result.id,
        message: `Test draft created successfully (ID: ${result.id})`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Test draft creation failed'
      };
    }
  }
}

export const wordpressService = new WordPressService();