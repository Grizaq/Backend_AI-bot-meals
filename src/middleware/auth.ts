// src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyToken, shouldRefreshToken, generateToken, type TokenPayload } from '../services/authService.js';
import { userRepository } from '../repositories/userRepository.js';

export interface AuthRequest<P = any> extends Request<P> {
  user?: TokenPayload;
}

const ACTIVITY_UPDATE_THROTTLE = 60 * 60 * 1000; // 1 hour in milliseconds

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    req.user = payload;

    // Check if token should be refreshed (within 3 minutes of expiration)
    if (shouldRefreshToken(token, 2880)) {
      const newToken = generateToken(payload.userId, payload.email, true); // true = isRefresh
      res.setHeader('X-New-Token', newToken);
    }

    // Update lastActive (throttled to once per hour)
    updateUserActivity(payload.userId).catch(err => {
      console.error('Failed to update user activity:', err);
      // Don't block the request if activity update fails
    });

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function updateUserActivity(userId: string): Promise<void> {
  const lastActive = await userRepository.getLastActive(userId);
  const now = new Date();

  // Only update if last activity was more than 1 hour ago (or never set)
  if (!lastActive || (now.getTime() - lastActive.getTime() > ACTIVITY_UPDATE_THROTTLE)) {
    await userRepository.updateLastActive(userId);
  }
}