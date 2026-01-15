// /src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import router from './router.js';
import { connectDB, closeDB } from './services/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(router)

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeDB();
  process.exit(0);
});