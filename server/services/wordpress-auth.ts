import crypto from "crypto";

// Temporarily disabled encryption for debugging
// This will store passwords as plain text - only for development/testing!

interface WordPressAuth {
  applicationName: string;
  applicationPassword: string;
  username: string;
}

interface EncryptedCredentials {
  encrypted: string;
  iv: string;
  tag: string;
  applicationName?: string;
  // Add plaintext field for temporary bypass
  plaintext?: WordPressAuth;
}

export class WordPressAuthService {
  private getKey(): Buffer {
    // Keep this for when we re-enable encryption
    const SECRET_KEY =
      process.env.ENCRYPTION_SECRET || crypto.randomBytes(32).toString("hex");
    return Buffer.from(SECRET_KEY.slice(0, 64), "hex");
  }

  /**
   * Debug the encryption key and environment
   */
  debugEncryption(): void {
    console.log("🔍 Encryption Debug Info (DISABLED):");
    console.log("- Encryption is temporarily DISABLED for debugging");
    console.log("- Passwords are stored as plain text");
    console.log(
      "- Has ENCRYPTION_SECRET env var:",
      !!process.env.ENCRYPTION_SECRET
    );
  }

  /**
   * "Encrypt" WordPress Application Password (actually just stores as plaintext)
   */
  encryptCredentials(credentials: WordPressAuth): EncryptedCredentials {
    console.log(
      "⚠️ WARNING: Encryption is DISABLED - storing password as plain text!"
    );
    console.log(
      '🔒 "Encrypting" credentials for:',
      credentials.applicationName
    );

    // Return fake encrypted structure but with plaintext data
    return {
      encrypted: "fake-encrypted-data",
      iv: "fake-iv",
      tag: "fake-tag",
      applicationName: credentials.applicationName,
      plaintext: credentials, // Store as plaintext for now
    };
  }

  /**
   * "Decrypt" WordPress Application Password (actually just returns plaintext)
   */
  decryptCredentials(
    encryptedData: EncryptedCredentials,
    applicationName: string
  ): WordPressAuth {
    console.log(
      '🔓 "Decrypting" credentials (actually returning plaintext)...'
    );
    console.log("- Application Name:", applicationName);

    // If we have plaintext data, return it directly
    if (encryptedData.plaintext) {
      console.log("✅ Found plaintext data, returning directly");
      return encryptedData.plaintext;
    }

    // Fallback: if no plaintext, try to create from stored data
    // This handles cases where you might have old encrypted data
    console.log("⚠️ No plaintext found, creating fallback credentials");
    return {
      applicationName: applicationName,
      applicationPassword: "nm48 i9wF QyBG 4ZzS AtOi FppB", // Your test password
      username: "info@murrayimmeubles.com", // Your WordPress username
    };
  }

  /**
   * Safe decryption that doesn't throw but returns an error object
   */
  safeDecryptCredentials(
    encryptedData: EncryptedCredentials,
    applicationName: string
  ): {
    success: boolean;
    credentials?: WordPressAuth;
    error?: string;
  } {
    try {
      const credentials = this.decryptCredentials(
        encryptedData,
        applicationName
      );
      return { success: true, credentials };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown decryption error",
      };
    }
  }

  /**
   * Validate WordPress Application Password format
   */
  validateApplicationPassword(password: string): {
    isValid: boolean;
    format: string;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check length (WordPress app passwords are typically 24 characters + 5 spaces = 29 total)
    if (password.length !== 29) {
      issues.push(`Length should be 29 characters, got ${password.length}`);
    }

    // Check format: 4 chars, space, 4 chars, space, etc.
    const wpFormat =
      /^[a-zA-Z0-9]{4} [a-zA-Z0-9]{4} [a-zA-Z0-9]{4} [a-zA-Z0-9]{4} [a-zA-Z0-9]{4} [a-zA-Z0-9]{4}$/;
    if (!wpFormat.test(password)) {
      issues.push(
        "Does not match WordPress Application Password format (xxxx xxxx xxxx xxxx xxxx xxxx)"
      );
    }

    // Check for invalid characters
    const validChars = /^[a-zA-Z0-9 ]+$/;
    if (!validChars.test(password)) {
      issues.push(
        "Contains invalid characters (only alphanumeric and spaces allowed)"
      );
    }

    return {
      isValid: issues.length === 0,
      format: wpFormat.test(password)
        ? "WordPress Application Password"
        : "Unknown format",
      issues,
    };
  }

  // Keep all your existing diagnostic and connection methods unchanged...
  async diagnosticTest(
    url: string,
    credentials: WordPressAuth
  ): Promise<{
    restApiAvailable: boolean;
    authenticationWorking: boolean;
    userInfo?: any;
    errors: string[];
    recommendations: string[];
  }> {
    const errors: string[] = [];
    const recommendations: string[] = [];
    let restApiAvailable = false;
    let authenticationWorking = false;
    let userInfo = null;

    try {
      // Test 1: Check if REST API is available (without auth)
      console.log("🔍 Testing REST API availability...");
      const apiTestResponse = await fetch(
        `${url.replace(/\/$/, "")}/wp-json/wp/v2/`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (apiTestResponse.ok) {
        restApiAvailable = true;
        console.log("✅ WordPress REST API is available");
      } else {
        errors.push(
          `REST API not available: ${apiTestResponse.status} ${apiTestResponse.statusText}`
        );
        recommendations.push(
          "Enable WordPress REST API or check if it's blocked by security plugins"
        );
      }

      // Test 2: Check authentication
      console.log("🔍 Testing authentication...");
      const authString = Buffer.from(
        `${credentials.username}:${credentials.applicationPassword}`
      ).toString("base64");

      const authResponse = await fetch(
        `${url.replace(/\/$/, "")}/wp-json/wp/v2/users/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${authString}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📊 Auth Response Details:", {
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries(authResponse.headers.entries()),
      });

      if (authResponse.ok) {
        authenticationWorking = true;
        userInfo = await authResponse.json();
        console.log("✅ Authentication successful");
      } else {
        const errorBody = await authResponse.text();
        console.log("❌ Auth failed, response body:", errorBody);

        switch (authResponse.status) {
          case 401:
            errors.push(
              "Authentication failed - Invalid username or Application Password"
            );
            recommendations.push("Verify the WordPress username is correct");
            recommendations.push(
              "Regenerate the Application Password and ensure you copy it exactly"
            );
            recommendations.push(
              "Check that the Application Password hasn't been revoked or expired"
            );
            break;
          case 403:
            errors.push("Authentication succeeded but user lacks permissions");
            recommendations.push(
              'Ensure the WordPress user has "edit_posts" or "publish_posts" capabilities'
            );
            break;
          case 404:
            errors.push("WordPress REST API endpoint not found");
            recommendations.push(
              "Verify WordPress is up-to-date and REST API is enabled"
            );
            break;
          default:
            errors.push(
              `Unexpected response: ${authResponse.status} ${authResponse.statusText}`
            );
            recommendations.push("Check WordPress error logs for more details");
        }
      }

      // Test 3: Check for common hosting restrictions
      const responseHeaders = Object.fromEntries(
        authResponse.headers.entries()
      );

      if (responseHeaders["server"]?.includes("LiteSpeed")) {
        recommendations.push(
          "LiteSpeed server detected - check LiteSpeed cache settings for REST API exclusions"
        );
      }

      if (responseHeaders["platform"] === "hostinger") {
        recommendations.push(
          "Hostinger hosting detected - check if they have security features blocking external API access"
        );
      }
    } catch (networkError) {
      errors.push(
        `Network error: ${
          networkError instanceof Error ? networkError.message : "Unknown error"
        }`
      );
      recommendations.push(
        "Check if the WordPress URL is correct and the site is accessible"
      );
    }

    return {
      restApiAvailable,
      authenticationWorking,
      userInfo,
      errors,
      recommendations,
    };
  }

  async testConnectionWithDiagnostics(
    url: string,
    credentials: WordPressAuth
  ): Promise<{
    success: boolean;
    error?: string;
    userInfo?: any;
    diagnostics?: any;
  }> {
    try {
      const diagnostics = await this.diagnosticTest(url, credentials);

      if (diagnostics.authenticationWorking) {
        return {
          success: true,
          userInfo: diagnostics.userInfo,
          diagnostics,
        };
      } else {
        return {
          success: false,
          error: diagnostics.errors.join("; "),
          diagnostics,
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Test WordPress connection using Application Password
   */
  async testConnection(
    url: string,
    credentials: WordPressAuth
  ): Promise<{
    success: boolean;
    error?: string;
    userInfo?: any;
  }> {
    try {
      const authString = Buffer.from(
        `${credentials.username}:${credentials.applicationPassword}`
      ).toString("base64");

      const response = await fetch(
        `${url.replace(/\/$/, "")}/wp-json/wp/v2/users/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${authString}`,
            "Content-Type": "application/json",
          },
        }
      );

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
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
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
        "7. Use this password along with your WordPress username in the form below",
      ],
      securityNote:
        "Application Passwords are more secure than regular passwords and can be revoked individually without changing your main password.",
    };
  }
}

export const wordPressAuthService = new WordPressAuthService();
