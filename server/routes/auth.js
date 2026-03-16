import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '7d';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function sanitizeUser(row) {
  const user = { ...row };
  delete user.password_hash;
  return user;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios' });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' });
    }

    if (typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Email invalido' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email ja cadastrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const user = sanitizeUser(result.rows[0]);
    const token = generateToken(user.id);

    res.status(201).json({ token, user });
  } catch (err) {
    process.stderr.write(`Register error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const token = generateToken(user.id);

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    process.stderr.write(`Login error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

export default router;
