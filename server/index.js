import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import mealRoutes from './routes/meals.js';
import trackingRoutes from './routes/tracking.js';
import marketRoutes from './routes/market.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — restrict to same origin in production
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3002'];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting for auth endpoints
const authLimiter = (() => {
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 min
  const MAX_ATTEMPTS = 10;
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const record = attempts.get(ip) || { count: 0, start: now };
    if (now - record.start > WINDOW_MS) { record.count = 0; record.start = now; }
    record.count++;
    attempts.set(ip, record);
    if (record.count > MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' });
    }
    next();
  };
})();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/market', marketRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, _req, res, _next) => {
  process.stderr.write(`Unhandled error: ${err.stack || err.message}\n`);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  process.stdout.write(`Plano Dieta API running on port ${PORT}\n`);
});
