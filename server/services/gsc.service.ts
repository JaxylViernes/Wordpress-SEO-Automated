// server/services/gsc.service.ts

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { storage } from '../storage';
import type { GscConfiguration, GscAccount } from '@shared/schema';

export class GSCService {
  private readonly GSC_SCOPES = [
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/indexing',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  async createOAuth2Client(userId: string): Promise<OAuth2Client | null> {
    const config = await storage.getGscConfiguration(userId);
    if (!config) return null;

    return new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  async generateAuthUrl(userId: string): Promise<string | null> {
    const oauth2Client = await this.createOAuth2Client(userId);
    if (!oauth2Client) return null;

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.GSC_SCOPES,
      prompt: 'consent',
      state: userId
    });
  }

  async exchangeCodeForTokens(userId: string, code: string) {
    const oauth2Client = await this.createOAuth2Client(userId);
    if (!oauth2Client) throw new Error('Configuration not found');

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  async getUserInfo(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  }

  async refreshAccessToken(userId: string, refreshToken: string) {
    const config = await storage.getGscConfiguration(userId);
    if (!config) throw new Error('Configuration not found');

    const authClient = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );
    authClient.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await authClient.refreshAccessToken();
    return credentials;
  }

  async testConfiguration(config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<boolean> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.GSC_SCOPES
      });

      return !!authUrl;
    } catch {
      return false;
    }
  }

  async getSearchConsoleProperties(userId: string, accountId: string) {
    const account = await storage.getGscAccount(userId, accountId);
    if (!account) throw new Error('Account not found');

    const oauth2Client = await this.createOAuth2Client(userId);
    if (!oauth2Client) throw new Error('Configuration not found');

    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiry
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const { data } = await searchconsole.sites.list();
    
    return data.siteEntry || [];
  }

  async submitUrlForIndexing(userId: string, accountId: string, url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
    // Check quota
    const quota = await storage.getGscQuotaUsage(accountId);
    if (quota.used >= quota.limit) {
      throw new Error('Daily quota exceeded (200 URLs/day)');
    }

    const account = await storage.getGscAccount(userId, accountId);
    if (!account) throw new Error('Account not found');

    const oauth2Client = await this.createOAuth2Client(userId);
    if (!oauth2Client) throw new Error('Configuration not found');

    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiry
    });

    const indexing = google.indexing({ version: 'v3', auth: oauth2Client });
    const result = await indexing.urlNotifications.publish({
      requestBody: { url, type }
    });

    // Update quota
    await storage.incrementGscQuotaUsage(accountId);

    return result.data;
  }
}

export const gscService = new GSCService();