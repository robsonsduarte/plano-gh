import { query } from '../db.js';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export default async function requireAdmin(req, res, next) {
  try {
    const result = await query('SELECT email, role FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    const user = result.rows[0];
    const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(user.email.toLowerCase());

    if (!isAdmin) {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    process.stderr.write(`Admin auth error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao verificar permissoes' });
  }
}
