// src/router.ts
import { Router } from "express";
import mealRoutes from './routes/mealRoutes.js';

const router = Router()

router.use('/api/meals', mealRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

export default router;