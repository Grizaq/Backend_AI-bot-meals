// /src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import router from './router.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(router)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});