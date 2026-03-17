import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import requireAdmin from '../middleware/admin.js';
import { query } from '../db.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/dashboard — Key metrics
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [usersTotal, usersActive, logsToday, subsActive] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(DISTINCT user_id) as count FROM meal_logs WHERE date >= $1::date - interval \'7 days\'', [todayStr]),
      query('SELECT COUNT(*) as count FROM meal_logs WHERE date = $1', [todayStr]),
      query('SELECT COUNT(*) as count FROM subscriptions WHERE status = $1', ['active']),
    ]);

    const monthlyRevenue = await query(
      `SELECT COUNT(*) FILTER (WHERE plan = 'monthly') as monthly,
              COUNT(*) FILTER (WHERE plan = 'annual') as annual
       FROM subscriptions WHERE status = 'active'`
    );
    const rev = monthlyRevenue.rows[0];
    const estimatedMRR = (Number(rev.monthly) * 27.90) + (Number(rev.annual) * 23.72);

    res.json({
      totalUsers: Number(usersTotal.rows[0].count),
      activeUsers7d: Number(usersActive.rows[0].count),
      mealsLoggedToday: Number(logsToday.rows[0].count),
      activeSubscriptions: Number(subsActive.rows[0].count),
      estimatedMRR: Math.round(estimatedMRR * 100) / 100,
    });
  } catch (err) {
    process.stderr.write(`Admin dashboard error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// GET /api/admin/users — List users with pagination and search
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.q || '').trim();

    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE name ILIKE $1 OR email ILIKE $1`;
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = Number(countResult.rows[0].total);

    const usersResult = await query(
      `SELECT id, name, email, sex, age, weight, height, diet_type, role, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      users: usersResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    process.stderr.write(`Admin users error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao listar usuarios' });
  }
});

// GET /api/admin/users/:id — User detail with recent activity
router.get('/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID invalido' });

    const [userResult, recentLogs, recentTracking, subscription] = await Promise.all([
      query('SELECT id, name, email, sex, age, weight, height, activity_level, diet_type, favorites, restrictions, quiz_result, role, created_at, updated_at FROM users WHERE id = $1', [userId]),
      query('SELECT date, meal_type, total_kcal, logged_at FROM meal_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 20', [userId]),
      query('SELECT date, weight, waist, hip, energy, sleep_quality FROM tracking WHERE user_id = $1 ORDER BY date DESC LIMIT 10', [userId]),
      query('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]),
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    res.json({
      user: userResult.rows[0],
      recentMealLogs: recentLogs.rows,
      recentTracking: recentTracking.rows,
      subscription: subscription.rows[0] || null,
    });
  } catch (err) {
    process.stderr.write(`Admin user detail error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao carregar usuario' });
  }
});

export default router;
