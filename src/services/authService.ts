// src/services/authService.ts
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  
  const options: jwt.SignOptions = {
    expiresIn: '7d'
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