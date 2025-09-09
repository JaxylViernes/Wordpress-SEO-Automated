import { WordPressAuthService } from "./wordpress-auth";

interface RepairOptions {
  websiteId: string;
  newUsername?: string;
  newPassword?: string;
  applicationName?: string;
}

export class CredentialRepairService {
  private authService = new WordPressAuthService();

  /**
   * Diagnose issues with stored encrypted credentials
   */
  async diagnoseCredentials(
    encryptedData: any,
    applicationName: string = "AI Content Manager"
  ): Promise<{
    canDecrypt: boolean;
    validFormat: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    console.log("🔍 Diagnosing encrypted credentials...");

    // Check if encrypted data structure is valid
    if (!encryptedData) {
      issues.push("No encrypted data found");
      recommendations.push("Re-encrypt WordPress credentials");
      return { canDecrypt: false, validFormat: false, issues, recommendations };
    }

    const requiredFields = ["encrypted", "iv", "tag"];
    for (const field of requiredFields) {
      if (!encryptedData[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    if (issues.length > 0) {
      recommendations.push(
        "Re-encrypt WordPress credentials with correct structure"
      );
      return { canDecrypt: false, validFormat: false, issues, recommendations };
    }

    // Try to decrypt
    const decryptResult = this.authService.safeDecryptCredentials(
      encryptedData,
      applicationName
    );

    if (!decryptResult.success) {
      issues.push(`Decryption failed: ${decryptResult.error}`);
      recommendations.push("Check ENCRYPTION_SECRET environment variable");
      recommendations.push("Verify application name matches encryption");
      recommendations.push("Re-encrypt credentials if key has changed");
      return { canDecrypt: false, validFormat: false, issues, recommendations };
    }

    // Check password format
    const credentials = decryptResult.credentials!;
    const passwordValidation = this.authService.validateApplicationPassword(
      credentials.applicationPassword
    );

    if (!passwordValidation.isValid) {
      issues.push(
        `Invalid password format: ${passwordValidation.issues.join(", ")}`
      );
      recommendations.push("Generate new WordPress Application Password");
      recommendations.push(
        "Ensure password follows format: xxxx xxxx xxxx xxxx xxxx xxxx"
      );
    }

    console.log(
      decryptResult.success ? "✅" : "❌",
      "Decryption result:",
      decryptResult.success
    );
    console.log(
      passwordValidation.isValid ? "✅" : "❌",
      "Password format valid:",
      passwordValidation.isValid
    );

    return {
      canDecrypt: decryptResult.success,
      validFormat: passwordValidation.isValid,
      issues,
      recommendations,
    };
  }

  /**
   * Re-encrypt credentials with new password
   */
  async repairCredentials(options: RepairOptions): Promise<{
    success: boolean;
    encryptedData?: any;
    error?: string;
  }> {
    try {
      console.log("🔧 Repairing WordPress credentials...");

      if (!options.newPassword || !options.newUsername) {
        return {
          success: false,
          error: "Both username and password are required for repair",
        };
      }

      // Validate the new password format
      const validation = this.authService.validateApplicationPassword(
        options.newPassword
      );
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid password format: ${validation.issues.join(", ")}`,
        };
      }

      // Create new credentials object
      const credentials = {
        applicationName: options.applicationName || "AI Content Manager",
        applicationPassword: options.newPassword,
        username: options.newUsername,
      };

      // Test encryption roundtrip
      const roundtripTest =
        this.authService.testEncryptionRoundtrip(credentials);
      if (!roundtripTest.success) {
        return {
          success: false,
          error: `Encryption test failed: ${roundtripTest.error}`,
        };
      }

      // Encrypt the new credentials
      const encryptedData = this.authService.encryptCredentials(credentials);

      console.log("✅ Credentials repaired successfully");
      console.log("- Username:", credentials.username);
      console.log("- Password format:", validation.format);
      console.log("- Application name:", credentials.applicationName);

      return {
        success: true,
        encryptedData,
      };
    } catch (error) {
      console.error("❌ Credential repair failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown repair error",
      };
    }
  }

  /**
   * Test connection with repaired credentials
   */
  async testRepairedCredentials(
    websiteUrl: string,
    encryptedData: any,
    applicationName: string = "AI Content Manager"
  ): Promise<{
    success: boolean;
    userInfo?: any;
    error?: string;
    diagnostics?: any;
  }> {
    try {
      console.log("🔗 Testing repaired credentials...");

      const decryptResult = this.authService.safeDecryptCredentials(
        encryptedData,
        applicationName
      );
      if (!decryptResult.success) {
        return {
          success: false,
          error: `Cannot decrypt credentials: ${decryptResult.error}`,
        };
      }

      const credentials = decryptResult.credentials!;
      const connectionTest =
        await this.authService.testConnectionWithDiagnostics(
          websiteUrl,
          credentials
        );

      return connectionTest;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      };
    }
  }
}

// Usage example script
export async function repairWordPressCredentials(
  websiteId: string,
  currentEncryptedData: any,
  newUsername: string,
  newApplicationPassword: string,
  websiteUrl: string
) {
  const repairService = new CredentialRepairService();

  console.log("🏥 WordPress Credential Repair Service");
  console.log("=====================================");

  // Step 1: Diagnose current credentials
  console.log("\n📋 Step 1: Diagnosing current credentials...");
  const diagnosis = await repairService.diagnoseCredentials(
    currentEncryptedData
  );
  console.log("Diagnosis results:", {
    canDecrypt: diagnosis.canDecrypt,
    validFormat: diagnosis.validFormat,
    issues: diagnosis.issues,
    recommendations: diagnosis.recommendations,
  });

  // Step 2: Repair credentials if needed
  if (!diagnosis.canDecrypt || !diagnosis.validFormat) {
    console.log("\n🔧 Step 2: Repairing credentials...");
    const repairResult = await repairService.repairCredentials({
      websiteId,
      newUsername,
      newPassword: newApplicationPassword,
      applicationName: "AI Content Manager",
    });

    if (!repairResult.success) {
      console.error("❌ Repair failed:", repairResult.error);
      return { success: false, error: repairResult.error };
    }

    console.log("✅ Credentials repaired successfully");

    // Step 3: Test repaired credentials
    console.log("\n🧪 Step 3: Testing repaired credentials...");
    const testResult = await repairService.testRepairedCredentials(
      websiteUrl,
      repairResult.encryptedData,
      "AI Content Manager"
    );

    if (testResult.success) {
      console.log("✅ Repaired credentials work!");
      console.log("User info:", testResult.userInfo);

      // TODO: Update your database with repairResult.encryptedData
      console.log("\n💾 Next steps:");
      console.log("- Update your database with the new encrypted credentials");
      console.log("- Remove the test password from your route handler");
      console.log("- Test publishing content");

      return {
        success: true,
        encryptedData: repairResult.encryptedData,
        userInfo: testResult.userInfo,
      };
    } else {
      console.error(
        "❌ Repaired credentials still don't work:",
        testResult.error
      );
      console.log("Diagnostics:", testResult.diagnostics);
      return {
        success: false,
        error: testResult.error,
        diagnostics: testResult.diagnostics,
      };
    }
  } else {
    console.log("✅ Current credentials are fine, no repair needed");
    return { success: true, message: "No repair needed" };
  }
}

// Quick test script you can run
export async function quickTest() {
  const testPassword = "nm48 i9wF QyBG 4ZzS AtOi FppB";
  const testUsername = "info@murrayimmeubles.com";
  const testUrl = "https://murrayimmeubles.com";

  await repairWordPressCredentials(
    "test-website-id",
    null, // No existing encrypted data
    testUsername,
    testPassword,
    testUrl
  );
}
