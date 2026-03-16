import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { query } from '../db.js';
import { generateMarketList } from '../services/market-generator.js';

const router = Router();
router.use(authenticate);

// GET /api/market/:weekNum
router.get('/:weekNum', async (req, res) => {
  try {
    const weekNum = Number(req.params.weekNum);

    if (isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
      return res.status(400).json({ error: 'Numero da semana deve estar entre 1 e 52' });
    }

    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    const user = userResult.rows[0];

    if (!user.sex || !user.age || !user.height || !user.weight) {
      return res.status(400).json({
        error: 'Complete seu perfil antes de gerar a lista de compras'
      });
    }

    const list = generateMarketList(user, weekNum);

    res.json({ weekNum, ...list });
  } catch (err) {
    process.stderr.write(`Market list error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao gerar lista de compras' });
  }
});

// GET /api/market/:weekNum/checks
router.get('/:weekNum/checks', async (req, res) => {
  try {
    const weekNum = Number(req.params.weekNum);

    if (isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
      return res.status(400).json({ error: 'Numero da semana invalido' });
    }

    const result = await query(
      'SELECT item_key, checked FROM market_checks WHERE user_id = $1 AND week_num = $2',
      [req.userId, weekNum]
    );

    const checks = {};
    for (const row of result.rows) {
      checks[row.item_key] = row.checked;
    }

    res.json({ weekNum, checks });
  } catch (err) {
    process.stderr.write(`Get checks error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao buscar itens marcados' });
  }
});

// POST /api/market/check
router.post('/check', async (req, res) => {
  try {
    const { weekNum, itemKey, checked } = req.body;

    if (!weekNum || !itemKey || typeof checked !== 'boolean') {
      return res.status(400).json({ error: 'weekNum, itemKey e checked sao obrigatorios' });
    }

    const week = Number(weekNum);
    if (isNaN(week) || week < 1 || week > 52) {
      return res.status(400).json({ error: 'Numero da semana invalido' });
    }

    if (typeof itemKey !== 'string' || itemKey.length > 50) {
      return res.status(400).json({ error: 'itemKey invalido' });
    }

    await query(
      `INSERT INTO market_checks (user_id, week_num, item_key, checked)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, week_num, item_key)
       DO UPDATE SET checked = $4`,
      [req.userId, week, itemKey, checked]
    );

    res.json({ weekNum: week, itemKey, checked });
  } catch (err) {
    process.stderr.write(`Toggle check error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao marcar item' });
  }
});

// DELETE /api/market/:weekNum/checks
router.delete('/:weekNum/checks', async (req, res) => {
  try {
    const weekNum = Number(req.params.weekNum);

    if (isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
      return res.status(400).json({ error: 'Numero da semana invalido' });
    }

    await query(
      'DELETE FROM market_checks WHERE user_id = $1 AND week_num = $2',
      [req.userId, weekNum]
    );

    res.json({ weekNum, cleared: true });
  } catch (err) {
    process.stderr.write(`Clear checks error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao limpar itens marcados' });
  }
});

export default router;
