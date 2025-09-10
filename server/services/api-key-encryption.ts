// Create this file: server/services/api-key-encryption.ts

import crypto from "crypto";

export class ApiKeyEncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltLength = 32;

  private getEncryptionKey(): string {
    const key =
      process.env.API_KEY_ENCRYPTION_SECRET ||
      process.env.SECRET_KEY ||
      "default-development-key-change-in-production";
    if (!key || key === "default-development-key-change-in-production") {
      console.warn(
        "⚠️ Using default encryption key. Set API_KEY_ENCRYPTION_SECRET in production!"
      );
    }
    return key;
  }

  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, "sha256");
  }

  encrypt(plaintext: string): string {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(this.getEncryptionKey(), salt);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");

      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, "hex"),
      ]);

      return combined.toString("base64");
    } catch (error) {
      console.error("Encryption failed:", error);
      throw new Error("Failed to encrypt API key");
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const combined = Buffer.from(encryptedData, "base64");

      let offset = 0;
      const salt = combined.subarray(offset, offset + this.saltLength);
      offset += this.saltLength;

      const iv = combined.subarray(offset, offset + this.ivLength);
      offset += this.ivLength;

      const tag = combined.subarray(offset, offset + this.tagLength);
      offset += this.tagLength;

      const encrypted = combined.subarray(offset);

      const key = this.deriveKey(this.getEncryptionKey(), salt);

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt API key");
    }
  }

  createMaskedKey(apiKey: string): string {
    if (apiKey.length <= 10) {
      return apiKey.substring(0, 3) + "...";
    }

    const start = apiKey.substring(0, 7);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  }

  validateApiKeyFormat(
    provider: string,
    apiKey: string
  ): { valid: boolean; error?: string } {
    if (!apiKey || typeof apiKey !== "string") {
      return { valid: false, error: "API key is required" };
    }

    switch (provider) {
      case "openai":
        if (!apiKey.startsWith("sk-")) {
          return {
            valid: false,
            error: 'OpenAI API keys must start with "sk-"',
          };
        }
        if (apiKey.length < 20) {
          return {
            valid: false,
            error: "OpenAI API key appears to be too short",
          };
        }
        break;

      case "anthropic":
        if (!apiKey.startsWith("sk-ant-")) {
          return {
            valid: false,
            error: 'Anthropic API keys must start with "sk-ant-"',
          };
        }
        if (apiKey.length < 20) {
          return {
            valid: false,
            error: "Anthropic API key appears to be too short",
          };
        }
        break;

      case "google_pagespeed":
        if (!apiKey.startsWith("AIza")) {
          return {
            valid: false,
            error: 'Google API keys must start with "AIza"',
          };
        }
        if (apiKey.length < 20) {
          return {
            valid: false,
            error: "Google API key appears to be too short",
          };
        }
        break;

      default:
        return { valid: false, error: "Unsupported provider" };
    }

    return { valid: true };
  }
}

export const apiKeyEncryptionService = new ApiKeyEncryptionService();
