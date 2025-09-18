// server/routes/gsc.routes.ts

import { Router, Request, Response } from 'express';
import { gscService } from '../services/gsc.service';
import { storage } from '../storage';

export const gscRouter = Router();

// Configuration endpoints
gscRouter.get('/configuration', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const config = await storage.getGscConfiguration(userId);
    
    res.json(config ? {
      ...config,
      clientSecret: '***HIDDEN***' // Mask secret in response
    } : null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

gscRouter.post('/configuration', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const config = await storage.saveGscConfiguration(userId, {
      clientId,
      clientSecret,
      redirectUri
    });

    res.json({
      ...config,
      clientSecret: '***HIDDEN***'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// OAuth endpoints
gscRouter.get('/auth-url', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const authUrl = await gscService.generateAuthUrl(userId);
    
    if (!authUrl) {
      return res.status(400).json({ error: 'Configuration required' });
    }

    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

gscRouter.post('/auth', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const tokens = await gscService.exchangeCodeForTokens(userId, code);
    const userInfo = await gscService.getUserInfo(tokens.access_token!);

    const account = await storage.saveGscAccount(userId, {
      id: userInfo.id!,
      email: userInfo.email!,
      name: userInfo.name || userInfo.email!,
      picture: userInfo.picture,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || '',
      tokenExpiry: tokens.expiry_date || Date.now() + 3600000
    });

    res.json({ account });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Add to your main server file:
// app.use('/api/gsc', requireAuth, gscRouter);