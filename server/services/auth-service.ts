// services/auth-service.ts
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { db } from "../db";
import type { InsertUser } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";

interface UserData {
  username: string;
  password: string;
  email?: string;
  name?: string;
}

interface AuthUser {
  id: string;
  username: string;
  email?: string;
  name?: string;
}

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      console.error("Password hashing error:", error);
      throw new Error("Failed to hash password");
    }
  }

  async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error("Password comparison error:", error);
      return false;
    }
  }

  // async createUser(userData: UserData): Promise<AuthUser> {
  //   try {
  //     console.log("🔍 Creating user:", {
  //       username: userData.username,
  //       hasEmail: !!userData.email,
  //     });

  //     // Validate input data
  //     const validationErrors = this.validateUserData(userData);
  //     if (validationErrors.length > 0) {
  //       console.error("❌ Validation errors:", validationErrors);
  //       throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
  //     }

  //     // Check if username already exists using your storage
  //     const existingUser = await storage.getUserByUsername(
  //       userData.username.toLowerCase().trim()
  //     );
  //     if (existingUser) {
  //       console.error("❌ Username already exists:", userData.username);
  //       throw new Error("Username already exists");
  //     }

  //     // Hash password
  //     const hashedPassword = await this.hashPassword(userData.password);

  //     // Create user using your storage interface (only fields in schema)
  //     const insertUserData: InsertUser = {
  //       username: userData.username.toLowerCase().trim(),
  //       password: hashedPassword,
  //       email: userData.email!.toLowerCase().trim(),
  //   ...(userData.name?.trim() ? { name: userData.name.trim() } : {})
  //     };

  //     const user = await storage.createUser(insertUserData);

  //     if (!user) {
  //       throw new Error("Failed to create user");
  //     }

  //     console.log("✅ User created successfully:", user.username);

  //     // Return user in format expected by routes (with email/name for compatibility)
  //     return {
  //       id: user.id,
  //       username: user.username,
  //       email: user.email, // Frontend compatibility
  //       name: user.name, // Frontend compatibility
  //     };
  //   } catch (error) {
  //     console.error("❌ Create user error:", error);

  //     if (error instanceof Error && error.message.includes("already exists")) {
  //       throw error;
  //     }

  //     throw new Error("Failed to create user account");
  //   }
  // }

  async createUser(userData: UserData): Promise<AuthUser> {
  const username = userData.username.trim().toLowerCase();
  const email = userData.email?.trim().toLowerCase();
  const name = userData.name?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please provide a valid email address");
  }

  // (keep your existing username check)
  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) throw new Error("Username already exists");

  const hashedPassword = await this.hashPassword(userData.password);

  const user = await storage.createUser({
    username,
    password: hashedPassword,
    email,                 // <- persisted
    ...(name ? { name } : {})
  } as InsertUser);

  if (!user) throw new Error("Failed to create user");

  return {
    id: user.id,
    username: user.username,
    email: user.email,     // <- returned from DB
    name: user.name ?? undefined,
  };
}


  async authenticateUser(
    username: string,
    password: string
  ): Promise<AuthUser> {
    try {
      console.log("🔍 Authenticating user:", username);

      if (!username || !password) {
        throw new Error("Invalid username or password");
      }

      // Find user using your storage
      const user = await storage.getUserByUsername(
        username.toLowerCase().trim()
      );

      if (!user) {
        console.warn("❌ User not found:", username);
        throw new Error("Invalid username or password");
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(
        password,
        user.password
      );

      if (!isPasswordValid) {
        console.warn("❌ Invalid password for user:", username);
        throw new Error("Invalid username or password");
      }

      console.log("✅ Authentication successful:", user.username);

      // Return user in format expected by routes
      return {
        id: user.id,
        username: user.username,
        email: undefined, // Not stored in current schema
        name: undefined, // Not stored in current schema
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Invalid username or password"
      ) {
        throw error;
      }

      console.error("❌ Authentication error:", error);
      throw new Error("Authentication failed");
    }
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    try {
      if (!id || id.trim() === "") {
        return null;
      }

      const user = await storage.getUser(id.trim());

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: undefined, // Not stored in current schema
        name: undefined, // Not stored in current schema
      };
    } catch (error) {
      console.error("❌ Get user by ID error:", error);
      return null;
    }
  }

  validateUserData(userData: Partial<UserData>): string[] {
    const errors: string[] = [];

    // Username validation
    if (userData.username !== undefined) {
      const username = userData.username.trim();

      if (!username) {
        errors.push("Username is required");
      } else if (username.length < 3) {
        errors.push("Username must be at least 3 characters long");
      } else if (username.length > 50) {
        errors.push("Username must not exceed 50 characters");
      } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push(
          "Username can only contain letters, numbers, hyphens, and underscores"
        );
      }
    }

    // Password validation - matching your frontend (6 chars minimum)
    if (userData.password !== undefined) {
      if (!userData.password) {
        errors.push("Password is required");
      } else if (userData.password.length < 6) {
        errors.push("Password must be at least 6 characters long");
      } else if (userData.password.length > 128) {
        errors.push("Password must not exceed 128 characters");
      }
    }

    // Email validation (optional, for frontend compatibility)
    if (userData.email !== undefined && userData.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email.trim())) {
        errors.push("Please provide a valid email address");
      }
    }

    // Name validation (optional, for frontend compatibility)
    if (userData.name !== undefined && userData.name.trim() !== "") {
      if (userData.name.length > 100) {
        errors.push("Name must not exceed 100 characters");
      }
    }

    return errors;
  }

  async updateUserPassword(
    userId: string,
    hashedPassword: string
  ): Promise<User | null> {
    try {
      const [user] = await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return user || null;
    } catch (error) {
      console.error("Failed to update user password:", error);
      throw new Error("Failed to update password");
    }
  }

  async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error("Password verification failed:", error);
      return false;
    }
  }

  // async hashPassword(password: string): Promise<string> {
  //   try {
  //     const saltRounds = 12;
  //     return await bcrypt.hash(password, saltRounds);
  //   } catch (error) {
  //     console.error('Password hashing failed:', error);
  //     throw new Error('Failed to hash password');
  //   }
  // }

  validatePassword(password: string): string[] {
    const errors: string[] = [];

    if (!password) {
      errors.push("Password is required");
      return errors;
    }

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (password.length > 128) {
      errors.push("Password must be less than 128 characters");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    // Check for common weak passwords
    const commonPasswords = [
      "password",
      "123456",
      "12345678",
      "qwerty",
      "abc123",
      "password123",
      "admin",
      "letmein",
      "welcome",
      "monkey",
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push("Password is too common. Please choose a stronger password");
    }

    return errors;
  }

  // Check if password was recently used (optional security feature)
  async isPasswordRecentlyUsed(
    userId: string,
    newPassword: string
  ): Promise<boolean> {
    // This would require storing password history
    // For now, just return false (not implemented)
    return false;
  }
}
