// server/routes/gsc.routes.ts - Working version with essential security
import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { gscStorage } from '../services/gsc-storage';
import { requireAuth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

// Rate limiting for auth endpoints (important security)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many requests, please slow down'
});

// Extend Request type
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

const router = Router();

// Apply rate limiting
router.use(apiLimiter);

const gscUserTokens = new Map<string, any>();

const GSC_SCOPES = [
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/indexing',
  'https://www.googleapis.com/auth/siteverification',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Simple validation helpers (non-breaking)
const validateClientCredentials = (clientId: string, clientSecret: string): string | null => {
  if (!clientId || !clientSecret) {
    return 'Client ID and Client Secret are required';
  }
  if (clientId.length < 10 || clientSecret.length < 10) {
    return 'Invalid credentials format';
  }
  // Check for obvious placeholders
  if (clientId.includes('your-client-id') || clientSecret.includes('your-client-secret')) {
    return 'Please use real credentials, not placeholders';
  }
  return null;
};

const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
};

// Configuration endpoint - Save user's OAuth credentials
router.post('/configure', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { clientId, clientSecret } = req.body;

    // Basic validation
    const error = validateClientCredentials(clientId, clientSecret);
    if (error) {
      return res.status(400).json({ error });
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback';

    // Save configuration to database
    await gscStorage.saveGscConfiguration(userId, {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      redirectUri
    });

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error: any) {
    console.error('Config save error:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Get OAuth URL - Uses saved configuration
router.get('/auth-url', requireAuth, authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    console.log(`🔐 Generating GSC OAuth URL for user: ${userId}`);
    
    // Get saved configuration
    const config = await gscStorage.getGscConfiguration(userId);
    
    if (!config) {
      return res.status(400).json({ 
        error: 'No configuration found. Please configure your Google OAuth credentials first.' 
      });
    }
    
    // Create OAuth client with saved credentials
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GSC_SCOPES,
      prompt: 'consent',
      state: userId
    });
    
    res.json({ authUrl });
  } catch (error) {
    console.error('GSC auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// POST version for compatibility if frontend sends credentials
router.post('/auth-url', requireAuth, authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { clientId, clientSecret } = req.body;
    
    console.log(`🔐 Generating GSC OAuth URL for user: ${userId}`);
    
    // If credentials provided, validate and save them first
    if (clientId && clientSecret) {
      const error = validateClientCredentials(clientId, clientSecret);
      if (error) {
        return res.status(400).json({ error });
      }
      
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback';
      await gscStorage.saveGscConfiguration(userId, {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUri
      });
    }
    
    // Get configuration
    const config = await gscStorage.getGscConfiguration(userId);
    
    if (!config) {
      return res.status(400).json({ 
        error: 'No configuration found. Please provide OAuth credentials.' 
      });
    }
    
    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GSC_SCOPES,
      prompt: 'consent',
      state: userId
    });
    
    res.json({ authUrl });
  } catch (error) {
    console.error('GSC auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Exchange code for tokens
router.post('/auth', requireAuth, authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code, state } = req.body;
    
    console.log(`🔐 Exchanging GSC auth code for user: ${userId}`);
    
    if (!code || typeof code !== 'string' || code.length < 10) {
      return res.status(400).json({ error: 'Valid authorization code required' });
    }
    
    // Get saved configuration
    const config = await gscStorage.getGscConfiguration(userId);
    
    if (!config) {
      return res.status(400).json({ 
        error: 'Configuration not found. Please configure OAuth credentials first.' 
      });
    }
    
    // Create OAuth2 client with saved credentials
    const authClient = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    
    try {
      const { tokens } = await authClient.getToken(code.trim());
      
      if (!tokens.access_token) {
        console.error('No access token received');
        return res.status(400).json({ error: 'Failed to obtain access token' });
      }
      
      authClient.setCredentials(tokens);
      
      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
      const { data: userInfo } = await oauth2.userinfo.get();
      
      // Basic email validation
      if (!userInfo.email || !userInfo.email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email received from Google' });
      }
      
      // Store account
      const gscAccount = {
        id: userInfo.id!,
        email: userInfo.email!,
        name: userInfo.name || userInfo.email!,
        picture: userInfo.picture || undefined,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || '',
        tokenExpiry: tokens.expiry_date || Date.now() + 3600000,
        isActive: true
      };
      
      // Store in memory cache
      gscUserTokens.set(`${userId}_${userInfo.id}`, tokens);
      
      // Save to database
      await gscStorage.saveGscAccount(userId, gscAccount);
      
      console.log(`✅ GSC account connected: ${userInfo.email}`);
      res.json({ account: gscAccount });
      
    } catch (tokenError: any) {
      if (tokenError.message?.includes('invalid_grant')) {
        console.error('Invalid grant - code may have been used or expired');
        return res.status(400).json({ 
          error: 'Authorization code expired or already used. Please try signing in again.' 
        });
      }
      if (tokenError.message?.includes('redirect_uri_mismatch')) {
        console.error('Redirect URI mismatch during token exchange');
        return res.status(400).json({ 
          error: 'Configuration error. Please check your redirect URI.' 
        });
      }
      throw tokenError;
    }
  } catch (error: any) {
    console.error('GSC auth error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Get properties
router.get('/properties', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { accountId } = req.query;
    
    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'Account ID required' });
    }
    
    // Get account with credentials using the join method
    const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
    if (!account) {
      return res.status(401).json({ error: 'Account not found or not authenticated' });
    }
    
    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      account.clientId,
      account.clientSecret,
      account.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
    );
    
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiry
    });
    
    // Get properties from Search Console
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const { data } = await searchconsole.sites.list();
    
    // Save properties to database
    for (const site of (data.siteEntry || [])) {
      await gscStorage.saveGscProperty(userId, accountId, {
        siteUrl: site.siteUrl!,
        permissionLevel: site.permissionLevel!,
        siteType: site.siteUrl?.startsWith('sc-domain:') ? 'DOMAIN' : 'SITE',
        verified: true
      });
    }
    
    const properties = (data.siteEntry || []).map(site => ({
      siteUrl: site.siteUrl!,
      permissionLevel: site.permissionLevel!,
      siteType: site.siteUrl?.startsWith('sc-domain:') ? 'DOMAIN' as const : 'SITE' as const,
      verified: true,
      accountId: accountId
    }));
    
    console.log(`✅ Found ${properties.length} GSC properties`);
    res.json(properties);
  } catch (error) {
    console.error('Error fetching GSC properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Submit URL for indexing
router.post('/index', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { accountId, url, type = 'URL_UPDATED' } = req.body;
    
    console.log(`📤 Submitting URL for indexing: ${url} (${type})`);
    
    if (!accountId || !url) {
      return res.status(400).json({ error: 'Account ID and URL required' });
    }
    
    // Basic URL validation
    try {
      new URL(url); // Will throw if invalid
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Validate type
    if (type !== 'URL_UPDATED' && type !== 'URL_DELETED') {
      return res.status(400).json({ error: 'Type must be URL_UPDATED or URL_DELETED' });
    }
    
    // Check quota
    const quota = await gscStorage.getGscQuotaUsage(accountId);
    if (quota.used >= quota.limit) {
      return res.status(429).json({ error: 'Daily quota exceeded (200 URLs/day)' });
    }
    
    // Get account with credentials
    const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
    if (!account) {
      return res.status(401).json({ error: 'Account not found or not authenticated' });
    }
    
    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      account.clientId,
      account.clientSecret,
      account.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
    );
    
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiry
    });
    
    // Use Indexing API
    const indexing = google.indexing({ version: 'v3', auth: oauth2Client });
    
    try {
      const result = await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: type
        }
      });
      
      // Track quota usage
      await gscStorage.incrementGscQuotaUsage(accountId, url);
      
      console.log(`✅ URL submitted for indexing: ${url}`);
      res.json({
        success: true,
        notifyTime: result.data.urlNotificationMetadata?.latestUpdate?.notifyTime,
        url: url
      });
      
    } catch (indexError: any) {
      if (indexError.code === 429) {
        return res.status(429).json({ error: 'Daily quota exceeded (200 URLs/day)' });
      }
      throw indexError;
    }
    
  } catch (error) {
    console.error('Indexing error:', error);
    res.status(500).json({ error: 'Failed to submit URL for indexing' });
  }
});

// URL Inspection
router.post('/inspect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { accountId, siteUrl, inspectionUrl } = req.body;
    
    console.log(`🔍 Inspecting URL: ${inspectionUrl}`);
    
    if (!accountId || !siteUrl || !inspectionUrl) {
      return res.status(400).json({ error: 'Account ID, site URL, and inspection URL required' });
    }
    
    // Basic URL validation
    try {
      new URL(inspectionUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid inspection URL format' });
    }
    
    // Get account with credentials
    const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
    if (!account) {
      return res.status(401).json({ error: 'Account not found or not authenticated' });
    }
    
    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      account.clientId,
      account.clientSecret,
      account.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
    );
    
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiry
    });
    
    // Use URL Inspection API
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    
    const result = await searchconsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: inspectionUrl,
        siteUrl: siteUrl
      }
    });
    
    const inspection = result.data.inspectionResult;
    
    // Transform result
    const inspectionResult = {
      url: inspectionUrl,
      indexStatus: inspection?.indexStatusResult?.coverageState || 'NOT_INDEXED',
      lastCrawlTime: inspection?.indexStatusResult?.lastCrawlTime,
      pageFetchState: inspection?.indexStatusResult?.pageFetchState,
      googleCanonical: inspection?.indexStatusResult?.googleCanonical,
      userCanonical: inspection?.indexStatusResult?.userCanonical,
      sitemap: inspection?.indexStatusResult?.sitemap,
      mobileUsability: inspection?.mobileUsabilityResult?.verdict || 'NEUTRAL',
      richResultsStatus: inspection?.richResultsResult?.verdict
    };
    
    // Save inspection result to database
    const properties = await gscStorage.getGscProperties(userId, accountId);
    const property = properties.find((p: any) => p.site_url === siteUrl);
    if (property) {
      await gscStorage.saveUrlInspection(property.id, inspectionResult);
    }
    
    console.log(`✅ URL inspection complete: ${inspectionResult.indexStatus}`);
    res.json(inspectionResult);
    
  } catch (error) {
    console.error('Inspection error:', error);
    res.status(500).json({ error: 'Failed to inspect URL' });
  }
});

// Submit Sitemap
router.post('/sitemap', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { accountId, siteUrl, sitemapUrl } = req.body;
    
    console.log(`📄 Submitting sitemap: ${sitemapUrl}`);
    
    if (!accountId || !siteUrl || !sitemapUrl) {
      return res.status(400).json({ error: 'Account ID, site URL, and sitemap URL required' });
    }
    
    // Basic sitemap URL validation
    try {
      const url = new URL(sitemapUrl);
      // Warn if it doesn't look like a sitemap
      if (!sitemapUrl.includes('sitemap') && !sitemapUrl.endsWith('.xml')) {
        console.warn('URL does not follow typical sitemap naming convention');
      }
    } catch {
      return res.status(400).json({ error: 'Invalid sitemap URL format' });
    }
    
    // Get account with credentials
    const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
    if (!account) {
      return res.status(401).json({ error: 'Account not found or not authenticated' });
    }
    
    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      account.clientId,
      account.clientSecret,
      account.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
    );
    
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiry
    });
    
    // Submit sitemap
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    
    await searchconsole.sitemaps.submit({
      siteUrl: siteUrl,
      feedpath: sitemapUrl
    });
    
    // Save to database
    const properties = await gscStorage.getGscProperties(userId, accountId);
    const property = properties.find((p: any) => p.site_url === siteUrl);
    if (property) {
      await gscStorage.saveSitemap(property.id, sitemapUrl);
    }
    
    console.log(`✅ Sitemap submitted: ${sitemapUrl}`);
    res.json({
      success: true,
      message: 'Sitemap submitted successfully'
    });
    
  } catch (error) {
    console.error('Sitemap submission error:', error);
    res.status(500).json({ error: 'Failed to submit sitemap' });
  }
});

// Get Performance Data
router.get('/performance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { accountId, siteUrl, days = '28' } = req.query;
    
    console.log(`📊 Fetching performance data for: ${siteUrl}`);
    
    if (!accountId || !siteUrl || typeof accountId !== 'string' || typeof siteUrl !== 'string') {
      return res.status(400).json({ error: 'Account ID and site URL required' });
    }
    
    const daysNum = parseInt(typeof days === 'string' ? days : '28');
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 90) {
      return res.status(400).json({ error: 'Days must be between 1 and 90' });
    }
    
    // Get account with credentials
    const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
    if (!account) {
      return res.status(401).json({ error: 'Account not found or not authenticated' });
    }
    
    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      account.clientId,
      account.clientSecret,
      account.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
    );
    
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiry
    });
    
    // Get performance data
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    
    const result = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['date'],
        metrics: ['clicks', 'impressions', 'ctr', 'position'],
        rowLimit: 1000
      }
    });
    
    const performanceData = (result.data.rows || []).map(row => ({
      date: row.keys?.[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0
    }));
    
    // Save performance data to database
    const properties = await gscStorage.getGscProperties(userId, accountId);
    const property = properties.find((p: any) => p.site_url === siteUrl);
    if (property) {
      await gscStorage.savePerformanceData(property.id, performanceData);
    }
    
    console.log(`✅ Performance data fetched: ${performanceData.length} days`);
    res.json(performanceData);
    
  } catch (error) {
    console.error('Performance data error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Refresh Token
router.post('/refresh-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { accountId, refreshToken } = req.body;
    
    console.log(`🔄 Refreshing GSC token for account: ${accountId}`);
    
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    // Get configuration
    const config = await gscStorage.getGscConfiguration(userId);
    if (!config) {
      return res.status(400).json({ error: 'Configuration not found' });
    }
    
    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update stored tokens
    await gscStorage.updateGscAccount(userId, accountId, {
      accessToken: credentials.access_token!,
      tokenExpiry: credentials.expiry_date!
    });
    
    console.log(`✅ GSC token refreshed for account: ${accountId}`);
    res.json({ 
      accessToken: credentials.access_token,
      tokenExpiry: credentials.expiry_date
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// OAuth Callback Handler - FIXED with better window communication
router.get('/oauth-callback', async (req: Request, res: Response) => {
  try {
    // Set headers to allow popup communication
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    const { code, state, error } = req.query;
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    
    if (error) {
      const safeError = escapeHtml(error as string);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: system-ui; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h2 class="error">Authentication Failed</h2>
          <p>${safeError}</p>
          <script>
            // Try multiple communication methods
            const error = ${JSON.stringify(safeError)};
            
            // Method 1: PostMessage
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_ERROR', 
                error: error 
              }, '${clientUrl}');
            }
            
            // Method 2: LocalStorage
            localStorage.setItem('gsc_auth_error', JSON.stringify({
              error: error,
              timestamp: Date.now()
            }));
            
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `);
    }
    
    if (!code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: system-ui; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h2 class="error">Missing Authorization Code</h2>
          <p>The authentication process didn't complete properly.</p>
          <script>
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_ERROR', 
                error: 'Missing authorization code' 
              }, '${clientUrl}');
            }
            localStorage.setItem('gsc_auth_error', JSON.stringify({
              error: 'Missing authorization code',
              timestamp: Date.now()
            }));
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `);
    }
    
    // Success - send code to parent window
    const safeCode = escapeHtml(code as string);
    const safeState = state ? escapeHtml(state as string) : '';
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { 
            font-family: system-ui; 
            padding: 20px; 
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            background: white;
            color: #333;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .success { color: #059669; }
          button {
            margin-top: 20px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover { background: #5a67d8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="success">✅ Authentication Successful!</h2>
          <p>Completing the authentication process...</p>
          <p>This window should close automatically.</p>
          <button onclick="closeWindow()">Close Window</button>
        </div>
        <script>
          const code = ${JSON.stringify(safeCode)};
          const state = ${JSON.stringify(safeState)};
          
          // Method 1: PostMessage to opener
          function sendToOpener() {
            if (window.opener && !window.opener.closed) {
              // Try multiple origins
              ['${clientUrl}', window.location.origin, '*'].forEach(origin => {
                try {
                  window.opener.postMessage({ 
                    type: 'GOOGLE_AUTH_SUCCESS', 
                    code: code,
                    state: state
                  }, origin);
                } catch(e) {}
              });
            }
          }
          
          // Method 2: LocalStorage for same-origin
          function saveToStorage() {
            try {
              localStorage.setItem('gsc_auth_result', JSON.stringify({
                type: 'GOOGLE_AUTH_SUCCESS',
                code: code,
                state: state,
                timestamp: Date.now()
              }));
              
              // Trigger storage event
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'gsc_auth_result',
                newValue: JSON.stringify({
                  type: 'GOOGLE_AUTH_SUCCESS',
                  code: code,
                  state: state,
                  timestamp: Date.now()
                })
              }));
            } catch(e) {}
          }
          
          // Method 3: BroadcastChannel
          function broadcastMessage() {
            try {
              const channel = new BroadcastChannel('gsc_auth');
              channel.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                code: code,
                state: state
              });
              channel.close();
            } catch(e) {}
          }
          
          // Send using all methods
          sendToOpener();
          saveToStorage();
          broadcastMessage();
          
          // Close window function
          function closeWindow() {
            window.close();
            // Fallback redirect if close doesn't work
            setTimeout(() => {
              window.location.href = '${clientUrl}';
            }, 100);
          }
          
          // Auto close after 2 seconds
          setTimeout(closeWindow, 2000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

export default router;


















// server/routes/gsc.routes.ts
// import { Router, Request, Response } from 'express';
// import { google } from 'googleapis';
// import { gscStorage } from '../services/gsc-storage';
// import { requireAuth } from '../middleware/auth';
// import { InputSanitizer, sanitizationMiddleware } from '../utils/sanitizer';

// // Extend Request type
// interface AuthenticatedRequest extends Request {
//   user?: {
//     id: string;
//     email?: string;
//   };
// }

// const router = Router();
// const gscUserTokens = new Map<string, any>();

// const GSC_SCOPES = [
//   'https://www.googleapis.com/auth/webmasters',
//   'https://www.googleapis.com/auth/indexing',
//   'https://www.googleapis.com/auth/siteverification',
//   'https://www.googleapis.com/auth/userinfo.email',
//   'https://www.googleapis.com/auth/userinfo.profile'
// ];

// // Configuration endpoint - Save user's OAuth credentials
// router.post('/configure', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { clientId, clientSecret } = req.body;

//     if (!clientId || !clientSecret) {
//       return res.status(400).json({ error: 'Client ID and Client Secret are required' });
//     }

//     const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback';

//     // Save configuration to database
//     await gscStorage.saveGscConfiguration(userId, {
//       clientId,
//       clientSecret,
//       redirectUri
//     });

//     res.json({ success: true, message: 'Configuration saved successfully' });
//   } catch (error: any) {
//     console.error('Config save error:', error);
//     res.status(500).json({ error: 'Failed to save configuration' });
//   }
// });

// // Get OAuth URL - Uses saved configuration
// router.get('/auth-url', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
    
//     console.log(`🔐 Generating GSC OAuth URL for user: ${userId}`);
    
//     // Get saved configuration
//     const config = await gscStorage.getGscConfiguration(userId);
    
//     if (!config) {
//       return res.status(400).json({ 
//         error: 'No configuration found. Please configure your Google OAuth credentials first.' 
//       });
//     }
    
//     // Create OAuth client with saved credentials
//     const oauth2Client = new google.auth.OAuth2(
//       config.clientId,
//       config.clientSecret,
//       config.redirectUri
//     );
    
//     const authUrl = oauth2Client.generateAuthUrl({
//       access_type: 'offline',
//       scope: GSC_SCOPES,
//       prompt: 'consent',
//       state: userId // Just pass userId in state
//     });
    
//     res.json({ authUrl });
//   } catch (error) {
//     console.error('GSC auth URL error:', error);
//     res.status(500).json({ error: 'Failed to generate auth URL' });
//   }
// });

// // POST version for compatibility if frontend sends credentials
// router.post('/auth-url', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { clientId, clientSecret } = req.body;
    
//     console.log(`🔐 Generating GSC OAuth URL for user: ${userId}`);
    
//     // If credentials provided, save them first
//     if (clientId && clientSecret) {
//       const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback';
//       await gscStorage.saveGscConfiguration(userId, {
//         clientId,
//         clientSecret,
//         redirectUri
//       });
//     }
    
//     // Get configuration
//     const config = await gscStorage.getGscConfiguration(userId);
    
//     if (!config) {
//       return res.status(400).json({ 
//         error: 'No configuration found. Please provide OAuth credentials.' 
//       });
//     }
    
//     // Create OAuth client
//     const oauth2Client = new google.auth.OAuth2(
//       config.clientId,
//       config.clientSecret,
//       config.redirectUri
//     );
    
//     const authUrl = oauth2Client.generateAuthUrl({
//       access_type: 'offline',
//       scope: GSC_SCOPES,
//       prompt: 'consent',
//       state: userId
//     });
    
//     res.json({ authUrl });
//   } catch (error) {
//     console.error('GSC auth URL error:', error);
//     res.status(500).json({ error: 'Failed to generate auth URL' });
//   }
// });

// // Exchange code for tokens
// router.post('/auth', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { code, state } = req.body;
    
//     console.log(`🔐 Exchanging GSC auth code for user: ${userId}`);
    
//     if (!code) {
//       return res.status(400).json({ error: 'Authorization code required' });
//     }
    
//     // Get saved configuration
//     const config = await gscStorage.getGscConfiguration(userId);
    
//     if (!config) {
//       return res.status(400).json({ 
//         error: 'Configuration not found. Please configure OAuth credentials first.' 
//       });
//     }
    
//     // Create OAuth2 client with saved credentials
//     const authClient = new google.auth.OAuth2(
//       config.clientId,
//       config.clientSecret,
//       config.redirectUri
//     );
    
//     try {
//       const { tokens } = await authClient.getToken(code);
      
//       if (!tokens.access_token) {
//         console.error('No access token received');
//         return res.status(400).json({ error: 'Failed to obtain access token' });
//       }
      
//       authClient.setCredentials(tokens);
      
//       // Get user info
//       const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
//       const { data: userInfo } = await oauth2.userinfo.get();
      
//       // Store account
//       const gscAccount = {
//         id: userInfo.id!,
//         email: userInfo.email!,
//         name: userInfo.name || userInfo.email!,
//         picture: userInfo.picture,
//         accessToken: tokens.access_token!,
//         refreshToken: tokens.refresh_token || '',
//         tokenExpiry: tokens.expiry_date || Date.now() + 3600000,
//         isActive: true
//       };
      
//       // Store in memory cache
//       gscUserTokens.set(`${userId}_${userInfo.id}`, tokens);
      
//       // Save to database
//       await gscStorage.saveGscAccount(userId, gscAccount);
      
//       console.log(`✅ GSC account connected: ${userInfo.email}`);
//       res.json({ account: gscAccount });
      
//     } catch (tokenError: any) {
//       if (tokenError.message?.includes('invalid_grant')) {
//         console.error('Invalid grant - code may have been used or expired');
//         return res.status(400).json({ 
//           error: 'Authorization code expired or already used. Please try signing in again.' 
//         });
//       }
//       if (tokenError.message?.includes('redirect_uri_mismatch')) {
//         console.error('Redirect URI mismatch during token exchange');
//         return res.status(400).json({ 
//           error: 'Configuration error. Please check your redirect URI.' 
//         });
//       }
//       throw tokenError;
//     }
//   } catch (error: any) {
//     console.error('GSC auth error:', error);
//     res.status(500).json({ 
//       error: 'Authentication failed',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined 
//     });
//   }
// });

// // Get properties
// router.get('/properties', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { accountId } = req.query;
    
//     if (!accountId || typeof accountId !== 'string') {
//       return res.status(400).json({ error: 'Account ID required' });
//     }
    
//     // Get account with credentials using the join method
//     const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
//     if (!account) {
//       return res.status(401).json({ error: 'Account not found or not authenticated' });
//     }
    
//     // Create OAuth client
//     const oauth2Client = new google.auth.OAuth2(
//       account.clientId,
//       account.clientSecret,
//       process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
//     );
    
//     oauth2Client.setCredentials({
//       access_token: account.accessToken,
//       refresh_token: account.refreshToken,
//       expiry_date: account.tokenExpiry
//     });
    
//     // Get properties from Search Console - FIX: use oauth2Client, not gscOAuth2Client
//     const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
//     const { data } = await searchconsole.sites.list();
    
//     // Save properties to database
//     for (const site of (data.siteEntry || [])) {
//       await gscStorage.saveGscProperty(userId, accountId, {
//         siteUrl: site.siteUrl!,
//         permissionLevel: site.permissionLevel!,
//         siteType: site.siteUrl?.startsWith('sc-domain:') ? 'DOMAIN' : 'SITE',
//         verified: true
//       });
//     }
    
//     const properties = (data.siteEntry || []).map(site => ({
//       siteUrl: site.siteUrl!,
//       permissionLevel: site.permissionLevel!,
//       siteType: site.siteUrl?.startsWith('sc-domain:') ? 'DOMAIN' as const : 'SITE' as const,
//       verified: true,
//       accountId: accountId
//     }));
    
//     console.log(`✅ Found ${properties.length} GSC properties`);
//     res.json(properties);
//   } catch (error) {
//     console.error('Error fetching GSC properties:', error);
//     res.status(500).json({ error: 'Failed to fetch properties' });
//   }
// });

// // Submit URL for indexing
// router.post('/index', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, url, type = 'URL_UPDATED' } = req.body;
    
//     console.log(`📤 Submitting URL for indexing: ${url} (${type})`);
    
//     if (!accountId || !url) {
//       return res.status(400).json({ error: 'Account ID and URL required' });
//     }
    
//     // Check quota
//     const quota = await gscStorage.getGscQuotaUsage(accountId);
//     if (quota.used >= quota.limit) {
//       return res.status(429).json({ error: 'Daily quota exceeded (200 URLs/day)' });
//     }
    
//     // Get account with credentials
//     const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
//     if (!account) {
//       return res.status(401).json({ error: 'Account not found or not authenticated' });
//     }
    
//     // Create OAuth client
//     const oauth2Client = new google.auth.OAuth2(
//       account.clientId,
//       account.clientSecret,
//       process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
//     );
    
//     oauth2Client.setCredentials({
//       access_token: account.accessToken,
//       refresh_token: account.refreshToken,
//       expiry_date: account.tokenExpiry
//     });
    
//     // Use Indexing API
//     const indexing = google.indexing({ version: 'v3', auth: oauth2Client });
    
//     try {
//       const result = await indexing.urlNotifications.publish({
//         requestBody: {
//           url: url,
//           type: type
//         }
//       });
      
//       // Track quota usage
//       await gscStorage.incrementGscQuotaUsage(accountId, url);
      
//       console.log(`✅ URL submitted for indexing: ${url}`);
//       res.json({
//         success: true,
//         notifyTime: result.data.urlNotificationMetadata?.latestUpdate?.notifyTime,
//         url: url
//       });
      
//     } catch (indexError: any) {
//       if (indexError.code === 429) {
//         return res.status(429).json({ error: 'Daily quota exceeded (200 URLs/day)' });
//       }
//       throw indexError;
//     }
    
//   } catch (error) {
//     console.error('Indexing error:', error);
//     res.status(500).json({ error: 'Failed to submit URL for indexing' });
//   }
// });

// // URL Inspection
// router.post('/inspect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, inspectionUrl } = req.body;
    
//     console.log(`🔍 Inspecting URL: ${inspectionUrl}`);
    
//     if (!accountId || !siteUrl || !inspectionUrl) {
//       return res.status(400).json({ error: 'Account ID, site URL, and inspection URL required' });
//     }
    
//     // Get account with credentials
//     const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
//     if (!account) {
//       return res.status(401).json({ error: 'Account not found or not authenticated' });
//     }
    
//     // Create OAuth client
//     const oauth2Client = new google.auth.OAuth2(
//       account.clientId,
//       account.clientSecret,
//       process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
//     );
    
//     oauth2Client.setCredentials({
//       access_token: account.accessToken,
//       refresh_token: account.refreshToken,
//       expiry_date: account.tokenExpiry
//     });
    
//     // Use URL Inspection API
//     const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    
//     const result = await searchconsole.urlInspection.index.inspect({
//       requestBody: {
//         inspectionUrl: inspectionUrl,
//         siteUrl: siteUrl
//       }
//     });
    
//     const inspection = result.data.inspectionResult;
    
//     // Transform result
//     const inspectionResult = {
//       url: inspectionUrl,
//       indexStatus: inspection?.indexStatusResult?.coverageState || 'NOT_INDEXED',
//       lastCrawlTime: inspection?.indexStatusResult?.lastCrawlTime,
//       pageFetchState: inspection?.indexStatusResult?.pageFetchState,
//       googleCanonical: inspection?.indexStatusResult?.googleCanonical,
//       userCanonical: inspection?.indexStatusResult?.userCanonical,
//       sitemap: inspection?.indexStatusResult?.sitemap,
//       mobileUsability: inspection?.mobileUsabilityResult?.verdict || 'NEUTRAL',
//       richResultsStatus: inspection?.richResultsResult?.verdict
//     };
    
//     // Save inspection result to database
//     const properties = await gscStorage.getGscProperties(userId, accountId);
//     const property = properties.find((p: any) => p.site_url === siteUrl);
//     if (property) {
//       await gscStorage.saveUrlInspection(property.id, inspectionResult);
//     }
    
//     console.log(`✅ URL inspection complete: ${inspectionResult.indexStatus}`);
//     res.json(inspectionResult);
    
//   } catch (error) {
//     console.error('Inspection error:', error);
//     res.status(500).json({ error: 'Failed to inspect URL' });
//   }
// });

// // Submit Sitemap
// router.post('/sitemap', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, sitemapUrl } = req.body;
    
//     console.log(`📄 Submitting sitemap: ${sitemapUrl}`);
    
//     if (!accountId || !siteUrl || !sitemapUrl) {
//       return res.status(400).json({ error: 'Account ID, site URL, and sitemap URL required' });
//     }
    
//     // Get account with credentials
//     const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
//     if (!account) {
//       return res.status(401).json({ error: 'Account not found or not authenticated' });
//     }
    
//     // Create OAuth client
//     const oauth2Client = new google.auth.OAuth2(
//       account.clientId,
//       account.clientSecret,
//       process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
//     );
    
//     oauth2Client.setCredentials({
//       access_token: account.accessToken,
//       refresh_token: account.refreshToken,
//       expiry_date: account.tokenExpiry
//     });
    
//     // Submit sitemap
//     const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    
//     await searchconsole.sitemaps.submit({
//       siteUrl: siteUrl,
//       feedpath: sitemapUrl
//     });
    
//     // Save to database
//     const properties = await gscStorage.getGscProperties(userId, accountId);
//     const property = properties.find((p: any) => p.site_url === siteUrl);
//     if (property) {
//       await gscStorage.saveSitemap(property.id, sitemapUrl);
//     }
    
//     console.log(`✅ Sitemap submitted: ${sitemapUrl}`);
//     res.json({
//       success: true,
//       message: 'Sitemap submitted successfully'
//     });
    
//   } catch (error) {
//     console.error('Sitemap submission error:', error);
//     res.status(500).json({ error: 'Failed to submit sitemap' });
//   }
// });

// // Get Performance Data
// router.get('/performance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, days = '28' } = req.query;
    
//     console.log(`📊 Fetching performance data for: ${siteUrl}`);
    
//     if (!accountId || !siteUrl || typeof accountId !== 'string' || typeof siteUrl !== 'string') {
//       return res.status(400).json({ error: 'Account ID and site URL required' });
//     }
    
//     // Get account with credentials
//     const account = await gscStorage.getGscAccountWithCredentials(userId, accountId);
    
//     if (!account) {
//       return res.status(401).json({ error: 'Account not found or not authenticated' });
//     }
    
//     // Create OAuth client
//     const oauth2Client = new google.auth.OAuth2(
//       account.clientId,
//       account.clientSecret,
//       process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
//     );
    
//     oauth2Client.setCredentials({
//       access_token: account.accessToken,
//       refresh_token: account.refreshToken,
//       expiry_date: account.tokenExpiry
//     });
    
//     // Get performance data
//     const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    
//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - parseInt(typeof days === 'string' ? days : '28'));
    
//     const result = await searchconsole.searchanalytics.query({
//       siteUrl: siteUrl,
//       requestBody: {
//         startDate: startDate.toISOString().split('T')[0],
//         endDate: endDate.toISOString().split('T')[0],
//         dimensions: ['date'],
//         metrics: ['clicks', 'impressions', 'ctr', 'position'],
//         rowLimit: 1000
//       }
//     });
    
//     const performanceData = (result.data.rows || []).map(row => ({
//       date: row.keys?.[0],
//       clicks: row.clicks || 0,
//       impressions: row.impressions || 0,
//       ctr: row.ctr || 0,
//       position: row.position || 0
//     }));
    
//     // Save performance data to database
//     const properties = await gscStorage.getGscProperties(userId, accountId);
//     const property = properties.find((p: any) => p.site_url === siteUrl);
//     if (property) {
//       await gscStorage.savePerformanceData(property.id, performanceData);
//     }
    
//     console.log(`✅ Performance data fetched: ${performanceData.length} days`);
//     res.json(performanceData);
    
//   } catch (error) {
//     console.error('Performance data error:', error);
//     res.status(500).json({ error: 'Failed to fetch performance data' });
//   }
// });

// // Refresh Token
// router.post('/refresh-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, refreshToken } = req.body;
    
//     console.log(`🔄 Refreshing GSC token for account: ${accountId}`);
    
//     // Get configuration
//     const config = await gscStorage.getGscConfiguration(userId);
//     if (!config) {
//       return res.status(400).json({ error: 'Configuration not found' });
//     }
    
//     // Create OAuth client
//     const oauth2Client = new google.auth.OAuth2(
//       config.clientId,
//       config.clientSecret,
//       config.redirectUri
//     );
    
//     oauth2Client.setCredentials({
//       refresh_token: refreshToken
//     });
    
//     const { credentials } = await oauth2Client.refreshAccessToken();
    
//     // Update stored tokens
//     await gscStorage.updateGscAccount(userId, accountId, {
//       accessToken: credentials.access_token!,
//       tokenExpiry: credentials.expiry_date!
//     });
    
//     console.log(`✅ GSC token refreshed for account: ${accountId}`);
//     res.json({ 
//       accessToken: credentials.access_token,
//       tokenExpiry: credentials.expiry_date
//     });
//   } catch (error) {
//     console.error('Token refresh error:', error);
//     res.status(500).json({ error: 'Failed to refresh token' });
//   }
// });

// // OAuth Callback Handler
// router.get('/oauth-callback', async (req: Request, res: Response) => {
//   try {
//     const { code, state, error } = req.query;
    
//     if (error) {
//       return res.send(`
//         <!DOCTYPE html>
//         <html>
//         <head><title>Authentication Error</title></head>
//         <body>
//           <script>
//             if (window.opener) {
//               window.opener.postMessage({ 
//                 type: 'GOOGLE_AUTH_ERROR', 
//                 error: '${error}' 
//               }, '*');
//               window.close();
//             }
//           </script>
//           <p>Authentication error: ${error}</p>
//         </body>
//         </html>
//       `);
//     }
    
//     if (!code) {
//       return res.send(`
//         <!DOCTYPE html>
//         <html>
//         <head><title>Authentication Error</title></head>
//         <body>
//           <script>
//             if (window.opener) {
//               window.opener.postMessage({ 
//                 type: 'GOOGLE_AUTH_ERROR', 
//                 error: 'Missing authorization code' 
//               }, '*');
//               window.close();
//             }
//           </script>
//           <p>Missing authorization code</p>
//         </body>
//         </html>
//       `);
//     }
    
//     // Send success message to opener window
//     res.send(`
//       <!DOCTYPE html>
//       <html>
//       <head><title>Authentication Successful</title></head>
//       <body>
//         <script>
//           if (window.opener) {
//             window.opener.postMessage({ 
//               type: 'GOOGLE_AUTH_SUCCESS', 
//               code: '${code}',
//               state: '${state || ''}'
//             }, '*');
//             window.close();
//           }
//         </script>
//         <p>Authentication successful! This window should close automatically...</p>
//       </body>
//       </html>
//     `);
//   } catch (error) {
//     console.error('OAuth callback error:', error);
//     res.status(500).send('Authentication failed');
//   }
// });

// export default router;