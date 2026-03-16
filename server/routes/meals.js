import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { query } from '../db.js';
import { generateWeekPlan } from '../services/meal-generator.js';
import { DIET_RULES } from '../data/foods.js';

const router = Router();
router.use(authenticate);

// GET /api/meals/:weekNum
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
        error: 'Complete seu perfil (sexo, idade, altura, peso) antes de gerar o plano'
      });
    }

    const days = generateWeekPlan(user, weekNum);
    const dietKey = user.diet_type === 'if' ? 'if' : (user.diet_type || 'normal');
    const rules = DIET_RULES[dietKey] || DIET_RULES.normal;

    res.json({
      weekNum,
      dietType: user.diet_type || 'normal',
      rules,
      days
    });
  } catch (err) {
    process.stderr.write(`Meal generation error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao gerar plano de refeicoes' });
  }
});

export default router;
