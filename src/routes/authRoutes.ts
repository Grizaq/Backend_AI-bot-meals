// src/routes/authRoutes.ts
import { Router, type Request, type Response } from 'express';
import { userRepository } from '../repositories/userRepository.js';
import { generateToken } from '../services/authService.js';

const router = Router();

interface RegisterRequest {
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

router.post('/register', async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    
    // Check if user exists
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }
    
    const user = await userRepository.createUser(email, password);
    const token = generateToken(user._id!.toString(), user.email);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id!.toString(),
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    const user = await userRepository.verifyPassword(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    
    const token = generateToken(user._id!.toString(), user.email);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id!.toString(),
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;