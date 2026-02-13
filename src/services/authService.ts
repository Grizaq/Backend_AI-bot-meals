// src/services/authService.ts
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateToken(userId: string, email: string, isRefresh: boolean = false): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  
  const options: jwt.SignOptions = {
    expiresIn: isRefresh ? '30d' : '7d' // 30 days for refresh, 7 days for initial login
  };
  
  return jwt.sign({ userId, email }, secret, options);
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  
  return jwt.verify(token, secret) as TokenPayload;
}

export function getTokenExpirationTime(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  } catch {
    return null;
  }
}

/**
 * Check if token should be refreshed
 * @param token - JWT token to check
 * @param refreshWindowMinutes - Refresh when this many minutes remain (default: 2880 = 2 days)
 */
export function shouldRefreshToken(token: string, refreshWindowMinutes: number = 2880): boolean {
  const expiration = getTokenExpirationTime(token);
  if (!expiration) return false;
  
  const now = new Date();
  const timeUntilExpiryMs = expiration.getTime() - now.getTime();
  const refreshWindowMs = refreshWindowMinutes * 60 * 1000;
  
  return timeUntilExpiryMs <= refreshWindowMs;
}