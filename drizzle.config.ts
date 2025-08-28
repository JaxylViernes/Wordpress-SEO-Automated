import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { neonConfig } from '@neondatabase/serverless';
import ws from "ws";

// Load environment variables
config();

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});