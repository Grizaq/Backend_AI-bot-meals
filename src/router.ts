// src/router.ts
import { Router } from "express";
import mealRoutes from './routes/mealRoutes.js';
import authRoutes from "./routes/authRoutes.js";

const router = Router()

router.use('/api/auth', authRoutes);
router.use('/api/meals', mealRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

export default router;