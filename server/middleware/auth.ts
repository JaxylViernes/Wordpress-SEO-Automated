import { Request, Response, NextFunction } from "express";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        // Add other user properties as needed
      };
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated (this depends on your auth setup)
  // If using sessions:
  if (req.session && req.session.userId) {
    // You might want to load the full user object here
    req.user = {
      id: req.session.userId,
      username: req.session.username || ''
    };
    return next();
  }

  // If using JWT or other token-based auth:
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // if (token) {
  //   try {
  //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //     req.user = decoded;
  //     return next();
  //   } catch (error) {
  //     return res.status(401).json({ error: 'Invalid token' });
  //   }
  // }

  // Not authenticated
  return res.status(401).json({ error: 'Authentication required' });
};