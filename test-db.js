import { config } from "dotenv";
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

config();

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set!');
    return;
  }

  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Try a simple query
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query successful:', result.rows[0]);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();