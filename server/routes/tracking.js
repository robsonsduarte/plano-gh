import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();
router.use(authenticate);

// GET /api/tracking
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM tracking WHERE user_id = $1 ORDER BY date DESC',
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    process.stderr.write(`Get tracking error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao buscar registros' });
  }
});

// POST /api/tracking
router.post('/', async (req, res) => {
  try {
    const { date, weight, waist, hip, energy, sleep_quality, notes } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Data e obrigatoria' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Data deve estar no formato YYYY-MM-DD' });
    }

    if (weight !== undefined && weight !== null) {
      const w = Number(weight);
      if (isNaN(w) || w < 30 || w > 300) {
        return res.status(400).json({ error: 'Peso deve estar entre 30 e 300 kg' });
      }
    }

    if (waist !== undefined && waist !== null) {
      const w = Number(waist);
      if (isNaN(w) || w < 40 || w > 200) {
        return res.status(400).json({ error: 'Cintura deve estar entre 40 e 200 cm' });
      }
    }

    if (hip !== undefined && hip !== null) {
      const h = Number(hip);
      if (isNaN(h) || h < 50 || h > 200) {
        return res.status(400).json({ error: 'Quadril deve estar entre 50 e 200 cm' });
      }
    }

    if (energy !== undefined && energy !== null) {
      const e = Number(energy);
      if (isNaN(e) || e < 1 || e > 5) {
        return res.status(400).json({ error: 'Energia deve estar entre 1 e 5' });
      }
    }

    if (sleep_quality !== undefined && sleep_quality !== null) {
      const s = Number(sleep_quality);
      if (isNaN(s) || s < 1 || s > 5) {
        return res.status(400).json({ error: 'Qualidade do sono deve estar entre 1 e 5' });
      }
    }

    const result = await query(
      `INSERT INTO tracking (user_id, date, weight, waist, hip, energy, sleep_quality, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.userId,
        date,
        weight || null,
        waist || null,
        hip || null,
        energy || null,
        sleep_quality || null,
        notes || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    process.stderr.write(`Create tracking error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao criar registro' });
  }
});

// DELETE /api/tracking/:id
router.delete('/:id', async (req, res) => {
  try {
    const trackingId = Number(req.params.id);

    if (isNaN(trackingId)) {
      return res.status(400).json({ error: 'ID invalido' });
    }

    const result = await query(
      'DELETE FROM tracking WHERE id = $1 AND user_id = $2 RETURNING id',
      [trackingId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro nao encontrado' });
    }

    res.json({ deleted: true, id: trackingId });
  } catch (err) {
    process.stderr.write(`Delete tracking error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao deletar registro' });
  }
});

export default router;
