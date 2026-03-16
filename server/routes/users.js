import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();
router.use(authenticate);

function sanitizeUser(row) {
  const user = { ...row };
  delete user.password_hash;
  return user;
}

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    process.stderr.write(`Get user error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PUT /api/users/me
router.put('/me', async (req, res) => {
  try {
    const { name, sex, age, height, weight, activity_level } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' });
      }
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }

    if (sex !== undefined) {
      if (sex !== 'M' && sex !== 'F') {
        return res.status(400).json({ error: 'Sexo deve ser M ou F' });
      }
      fields.push(`sex = $${idx++}`);
      values.push(sex);
    }

    if (age !== undefined) {
      const ageNum = Number(age);
      if (isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
        return res.status(400).json({ error: 'Idade deve estar entre 10 e 120' });
      }
      fields.push(`age = $${idx++}`);
      values.push(ageNum);
    }

    if (height !== undefined) {
      const heightNum = Number(height);
      if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
        return res.status(400).json({ error: 'Altura deve estar entre 100 e 250 cm' });
      }
      fields.push(`height = $${idx++}`);
      values.push(heightNum);
    }

    if (weight !== undefined) {
      const weightNum = Number(weight);
      if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
        return res.status(400).json({ error: 'Peso deve estar entre 30 e 300 kg' });
      }
      fields.push(`weight = $${idx++}`);
      values.push(weightNum);
    }

    if (activity_level !== undefined) {
      const valid = ['sedentary', 'light', 'moderate', 'very_active', 'extreme'];
      if (!valid.includes(activity_level)) {
        return res.status(400).json({ error: `Nivel de atividade deve ser um de: ${valid.join(', ')}` });
      }
      fields.push(`activity_level = $${idx++}`);
      values.push(activity_level);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.userId);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    process.stderr.write(`Update user error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// PUT /api/users/me/preferences
router.put('/me/preferences', async (req, res) => {
  try {
    const { favorites, restrictions } = req.body;

    if (favorites !== undefined && !Array.isArray(favorites)) {
      return res.status(400).json({ error: 'Favoritos deve ser um array' });
    }

    if (restrictions !== undefined && !Array.isArray(restrictions)) {
      return res.status(400).json({ error: 'Restricoes deve ser um array' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (favorites !== undefined) {
      fields.push(`favorites = $${idx++}`);
      values.push(favorites);
    }

    if (restrictions !== undefined) {
      fields.push(`restrictions = $${idx++}`);
      values.push(restrictions);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.userId);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);

    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    process.stderr.write(`Update preferences error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao atualizar preferencias' });
  }
});

// PUT /api/users/me/diet
router.put('/me/diet', async (req, res) => {
  try {
    const { diet_type } = req.body;

    const valid = ['normal', 'keto', 'carnivore', 'if'];
    if (!diet_type || !valid.includes(diet_type)) {
      return res.status(400).json({ error: `Tipo de dieta deve ser um de: ${valid.join(', ')}` });
    }

    const result = await query(
      'UPDATE users SET diet_type = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [diet_type, req.userId]
    );

    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    process.stderr.write(`Update diet error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao atualizar dieta' });
  }
});

// PUT /api/users/me/quiz
router.put('/me/quiz', async (req, res) => {
  try {
    const { answers, result: quizResult } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Respostas do quiz sao obrigatorias' });
    }

    if (!quizResult || typeof quizResult !== 'object') {
      return res.status(400).json({ error: 'Resultado do quiz e obrigatorio' });
    }

    const dbResult = await query(
      'UPDATE users SET quiz_answers = $1, quiz_result = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [JSON.stringify(answers), JSON.stringify(quizResult), req.userId]
    );

    res.json(sanitizeUser(dbResult.rows[0]));
  } catch (err) {
    process.stderr.write(`Update quiz error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao salvar quiz' });
  }
});

export default router;
