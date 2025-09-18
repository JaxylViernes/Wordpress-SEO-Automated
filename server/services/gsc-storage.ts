

// //server/services/gsc-storage.ts
// import { Pool } from 'pg';

// // Use your existing Neon database connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }
// });

// export const gscStorage = {
//   async saveGscAccount(userId: string, account: any) {
//     const query = `
//       INSERT INTO gsc_accounts (id, user_id, email, name, picture, access_token, refresh_token, token_expiry, is_active)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//       ON CONFLICT(id) DO UPDATE SET
//         access_token = EXCLUDED.access_token,
//         refresh_token = EXCLUDED.refresh_token,
//         token_expiry = EXCLUDED.token_expiry,
//         is_active = EXCLUDED.is_active,
//         updated_at = NOW()
//       RETURNING *
//     `;
    
//     // Convert milliseconds to seconds for INTEGER column
//     const tokenExpiryInSeconds = Math.floor(account.tokenExpiry / 1000);
    
//     const values = [
//       account.id,
//       userId,
//       account.email,
//       account.name,
//       account.picture || null,
//       account.accessToken,
//       account.refreshToken,
//       tokenExpiryInSeconds, // Use seconds instead of milliseconds
//       true
//     ];
    
//     const result = await pool.query(query, values);
//     return account;
//   },

//   async getGscAccount(userId: string, accountId: string) {
//     const query = 'SELECT * FROM gsc_accounts WHERE user_id = $1 AND id = $2';
//     const result = await pool.query(query, [userId, accountId]);
    
//     if (result.rows.length === 0) return null;
    
//     const row = result.rows[0];
//     return {
//       id: row.id,
//       email: row.email,
//       name: row.name,
//       picture: row.picture,
//       accessToken: row.access_token,
//       refreshToken: row.refresh_token,
//       tokenExpiry: row.token_expiry * 1000, // Convert seconds back to milliseconds
//       isActive: row.is_active
//     };
//   },

//   async updateGscAccount(userId: string, accountId: string, updates: any) {
//     const query = `
//       UPDATE gsc_accounts 
//       SET access_token = $1, token_expiry = $2, updated_at = NOW()
//       WHERE user_id = $3 AND id = $4
//       RETURNING *
//     `;
    
//     // Convert milliseconds to seconds for INTEGER column
//     const tokenExpiryInSeconds = Math.floor(updates.tokenExpiry / 1000);
    
//     await pool.query(query, [
//       updates.accessToken,
//       tokenExpiryInSeconds, // Use seconds instead of milliseconds
//       userId,
//       accountId
//     ]);
    
//     return { success: true };
//   },

//   async getAllGscAccounts(userId: string) {
//     const query = 'SELECT * FROM gsc_accounts WHERE user_id = $1 ORDER BY created_at DESC';
//     const result = await pool.query(query, [userId]);
    
//     return result.rows.map(row => ({
//       id: row.id,
//       email: row.email,
//       name: row.name,
//       picture: row.picture,
//       accessToken: row.access_token,
//       refreshToken: row.refresh_token,
//       tokenExpiry: row.token_expiry * 1000, // Convert seconds back to milliseconds
//       isActive: row.is_active
//     }));
//   },

//   async deleteGscAccount(userId: string, accountId: string) {
//     const query = 'DELETE FROM gsc_accounts WHERE user_id = $1 AND id = $2';
//     await pool.query(query, [userId, accountId]);
//     return { success: true };
//   }
// };




// server/services/gsc-storage.ts
import { Pool } from 'pg';

// Use your existing Neon database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface GscConfiguration {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GscAccount {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  isActive: boolean;
}

export const gscStorage = {
  // Configuration management - matches gsc_configurations table
  async saveGscConfiguration(userId: string, config: GscConfiguration) {
    const query = `
      INSERT INTO gsc_configurations (user_id, client_id, client_secret, redirect_uri)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(user_id) DO UPDATE SET
        client_id = EXCLUDED.client_id,
        client_secret = EXCLUDED.client_secret,
        redirect_uri = EXCLUDED.redirect_uri,
        updated_at = NOW()
      RETURNING *
    `;
    
    const values = [userId, config.clientId, config.clientSecret, config.redirectUri];
    await pool.query(query, values);
    return config;
  },

  async getGscConfiguration(userId: string): Promise<GscConfiguration | null> {
    const query = 'SELECT client_id, client_secret, redirect_uri FROM gsc_configurations WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      clientId: row.client_id,
      clientSecret: row.client_secret,
      redirectUri: row.redirect_uri
    };
  },

  // Account management - matches gsc_accounts table
  async saveGscAccount(userId: string, account: GscAccount) {
    const query = `
      INSERT INTO gsc_accounts (
        id, user_id, email, name, picture, 
        access_token, refresh_token, token_expiry, is_active
      )
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
      tokenExpiryInSeconds,
      account.isActive !== false
    ];
    
    const result = await pool.query(query, values);
    return account;
  },

  async getGscAccount(userId: string, accountId: string): Promise<GscAccount | null> {
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

  async getGscAccountWithCredentials(userId: string, accountId: string) {
    const query = `
      SELECT 
        a.*,
        c.client_id,
        c.client_secret,
        c.redirect_uri
      FROM gsc_accounts a
      JOIN gsc_configurations c ON c.user_id = a.user_id
      WHERE a.user_id = $1 AND a.id = $2
    `;
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
      tokenExpiry: row.token_expiry * 1000,
      isActive: row.is_active,
      clientId: row.client_id,
      clientSecret: row.client_secret
    };
  },

  async updateGscAccount(userId: string, accountId: string, updates: Partial<GscAccount>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.accessToken !== undefined) {
      fields.push(`access_token = $${paramCount++}`);
      values.push(updates.accessToken);
    }

    if (updates.refreshToken !== undefined) {
      fields.push(`refresh_token = $${paramCount++}`);
      values.push(updates.refreshToken);
    }

    if (updates.tokenExpiry !== undefined) {
      fields.push(`token_expiry = $${paramCount++}`);
      values.push(Math.floor(updates.tokenExpiry / 1000));
    }

    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }

    if (fields.length === 0) return { success: true };

    values.push(userId, accountId);

    const query = `
      UPDATE gsc_accounts 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramCount} AND id = $${paramCount + 1}
      RETURNING *
    `;
    
    await pool.query(query, values);
    return { success: true };
  },

  async getAllGscAccounts(userId: string): Promise<GscAccount[]> {
    const query = 'SELECT * FROM gsc_accounts WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: row.token_expiry * 1000,
      isActive: row.is_active
    }));
  },

  async deleteGscAccount(userId: string, accountId: string) {
    const query = 'DELETE FROM gsc_accounts WHERE user_id = $1 AND id = $2';
    await pool.query(query, [userId, accountId]);
    return { success: true };
  },

  // Properties management
  async saveGscProperty(userId: string, accountId: string, property: any) {
    const query = `
      INSERT INTO gsc_properties (
        user_id, account_id, site_url, permission_level, 
        site_type, verified, last_synced
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT(site_url) DO UPDATE SET
        permission_level = EXCLUDED.permission_level,
        verified = EXCLUDED.verified,
        last_synced = NOW(),
        updated_at = NOW()
      RETURNING *
    `;
    
    const values = [
      userId,
      accountId,
      property.siteUrl,
      property.permissionLevel,
      property.siteType,
      property.verified
    ];
    
    await pool.query(query, values);
    return property;
  },

  async getGscProperties(userId: string, accountId?: string) {
    let query = 'SELECT * FROM gsc_properties WHERE user_id = $1';
    const values: any[] = [userId];
    
    if (accountId) {
      query += ' AND account_id = $2';
      values.push(accountId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    return result.rows;
  },

  // Quota management using gsc_quota_usage table
  async getGscQuotaUsage(accountId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // First check if record exists for today
    let query = `
      SELECT count, limit_count 
      FROM gsc_quota_usage 
      WHERE account_id = $1 AND date = $2
    `;
    let result = await pool.query(query, [accountId, today]);
    
    if (result.rows.length === 0) {
      // Create record for today
      query = `
        INSERT INTO gsc_quota_usage (account_id, date, count, limit_count)
        VALUES ($1, $2, 0, 200)
        RETURNING count, limit_count
      `;
      result = await pool.query(query, [accountId, today]);
    }
    
    return {
      used: result.rows[0].count,
      limit: result.rows[0].limit_count
    };
  },

  async incrementGscQuotaUsage(accountId: string, url?: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // Increment quota count
    const query = `
      INSERT INTO gsc_quota_usage (account_id, date, count, limit_count)
      VALUES ($1, $2, 1, 200)
      ON CONFLICT(account_id, date) DO UPDATE SET
        count = gsc_quota_usage.count + 1,
        updated_at = NOW()
      RETURNING count
    `;
    
    const result = await pool.query(query, [accountId, today]);
    
    // Also track in indexing requests if URL provided
    if (url) {
      await this.trackIndexingRequest(accountId, url, 'pending');
    }
    
    return { success: true, count: result.rows[0].count };
  },

  // Indexing requests tracking
  async trackIndexingRequest(accountId: string, url: string, status: string) {
    // Get property ID for this URL
    const propertyQuery = `
      SELECT id FROM gsc_properties 
      WHERE account_id = $1 
      AND $2 LIKE site_url || '%'
      LIMIT 1
    `;
    const propertyResult = await pool.query(propertyQuery, [accountId, url]);
    
    if (propertyResult.rows.length === 0) {
      // If no property found, skip tracking
      return { success: false, message: 'No matching property found' };
    }
    
    const propertyId = propertyResult.rows[0].id;
    
    // Get user_id from account
    const userQuery = 'SELECT user_id FROM gsc_accounts WHERE id = $1';
    const userResult = await pool.query(userQuery, [accountId]);
    
    if (userResult.rows.length === 0) {
      return { success: false, message: 'Account not found' };
    }
    
    const userId = userResult.rows[0].user_id;
    
    const query = `
      INSERT INTO gsc_indexing_requests (
        user_id, account_id, property_id, url, type, status, created_at
      )
      VALUES ($1, $2, $3, $4, 'URL_UPDATED', $5, NOW())
    `;
    
    await pool.query(query, [userId, accountId, propertyId, url, status]);
    return { success: true };
  },

  // Performance data
  async savePerformanceData(propertyId: string, data: any[]) {
    const query = `
      INSERT INTO gsc_performance_data (
        property_id, date, clicks, impressions, ctr, position
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `;
    
    for (const row of data) {
      await pool.query(query, [
        propertyId,
        row.date,
        row.clicks,
        row.impressions,
        row.ctr,
        row.position
      ]);
    }
    
    return { success: true };
  },

  // URL Inspections
  async saveUrlInspection(propertyId: string, inspection: any) {
    const query = `
      INSERT INTO gsc_url_inspections (
        property_id, url, index_status, last_crawl_time,
        page_fetch_state, google_canonical, user_canonical,
        mobile_usability, rich_results_status, full_result,
        inspected_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `;
    
    const values = [
      propertyId,
      inspection.url,
      inspection.indexStatus,
      inspection.lastCrawlTime || null,
      inspection.pageFetchState || null,
      inspection.googleCanonical || null,
      inspection.userCanonical || null,
      inspection.mobileUsability || null,
      inspection.richResultsStatus || null,
      JSON.stringify(inspection)
    ];
    
    await pool.query(query, values);
    return { success: true };
  },

  // Sitemaps
  async saveSitemap(propertyId: string, sitemapUrl: string) {
    const query = `
      INSERT INTO gsc_sitemaps (property_id, sitemap_url, status, last_submitted)
      VALUES ($1, $2, 'submitted', NOW())
      ON CONFLICT DO NOTHING
    `;
    
    await pool.query(query, [propertyId, sitemapUrl]);
    return { success: true };
  }
};

// No need for createGscTables since tables already exist
export const createGscTables = async () => {
  console.log('GSC tables already exist in Neon database');
  return true;
};

export const migrateGscTables = async () => {
  console.log('GSC tables already configured in Neon database');
  return true;
};