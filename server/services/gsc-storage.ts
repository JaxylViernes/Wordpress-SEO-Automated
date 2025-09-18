import { Pool } from 'pg';

// Use your existing Neon database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const gscStorage = {
  async saveGscAccount(userId: string, account: any) {
    const query = `
      INSERT INTO gsc_accounts (id, user_id, email, name, picture, access_token, refresh_token, token_expiry, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT(id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expiry = EXCLUDED.token_expiry,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
    `;
    
    // Convert milliseconds to seconds for INTEGER column
    const tokenExpiryInSeconds = Math.floor(account.tokenExpiry / 1000);
    
    const values = [
      account.id,
      userId,
      account.email,
      account.name,
      account.picture || null,
      account.accessToken,
      account.refreshToken,
      tokenExpiryInSeconds, // Use seconds instead of milliseconds
      true
    ];
    
    const result = await pool.query(query, values);
    return account;
  },

  async getGscAccount(userId: string, accountId: string) {
    const query = 'SELECT * FROM gsc_accounts WHERE user_id = $1 AND id = $2';
    const result = await pool.query(query, [userId, accountId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: row.token_expiry * 1000, // Convert seconds back to milliseconds
      isActive: row.is_active
    };
  },

  async updateGscAccount(userId: string, accountId: string, updates: any) {
    const query = `
      UPDATE gsc_accounts 
      SET access_token = $1, token_expiry = $2, updated_at = NOW()
      WHERE user_id = $3 AND id = $4
      RETURNING *
    `;
    
    // Convert milliseconds to seconds for INTEGER column
    const tokenExpiryInSeconds = Math.floor(updates.tokenExpiry / 1000);
    
    await pool.query(query, [
      updates.accessToken,
      tokenExpiryInSeconds, // Use seconds instead of milliseconds
      userId,
      accountId
    ]);
    
    return { success: true };
  },

  async getAllGscAccounts(userId: string) {
    const query = 'SELECT * FROM gsc_accounts WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: row.token_expiry * 1000, // Convert seconds back to milliseconds
      isActive: row.is_active
    }));
  },

  async deleteGscAccount(userId: string, accountId: string) {
    const query = 'DELETE FROM gsc_accounts WHERE user_id = $1 AND id = $2';
    await pool.query(query, [userId, accountId]);
    return { success: true };
  }
};