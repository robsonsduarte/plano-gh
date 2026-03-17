import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { query } from '../db.js';
import { generateWeekPlan } from '../services/meal-generator.js';
import { FOODS, DIET_RULES } from '../data/foods.js';
import { resolveMacros, getConsumedMacros, getLoggedMealIndexes, adjustDayMeals } from '../services/meal-adjuster.js';
import { estimateFromText, estimateFromImage } from '../services/food-ai.js';
import { buildNutritionMemory } from '../services/nutrition-memory.js';

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

// POST /api/meals/log — Log what the user actually ate
router.post('/log', async (req, res) => {
  try {
    const { date, weekNum, dayNum, mealIndex, mealType, originalItems, loggedItems } = req.body;

    if (!date || mealIndex === undefined || !loggedItems || !Array.isArray(loggedItems)) {
      return res.status(400).json({ error: 'date, mealIndex e loggedItems sao obrigatorios' });
    }

    const macros = resolveMacros(loggedItems);

    await query(
      `INSERT INTO meal_logs (user_id, date, week_num, day_num, meal_index, meal_type, original_items, logged_items, total_kcal, total_prot, total_carb, total_fat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (user_id, date, meal_index)
       DO UPDATE SET logged_items = $8, total_kcal = $9, total_prot = $10, total_carb = $11, total_fat = $12, logged_at = NOW()`,
      [req.userId, date, weekNum || 1, dayNum || 1, mealIndex, mealType || '', originalItems || '', JSON.stringify(loggedItems), macros.kcal, macros.prot, macros.carb, macros.fat]
    );

    // Regenerate remaining meals with adjusted calorie budget
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];

    const days = generateWeekPlan(user, weekNum || 1);
    const dayData = days[(dayNum || 1) - 1];
    const originalMeals = dayData ? dayData.meals : [];

    const adjustment = await adjustDayMeals(user, weekNum || 1, dayNum || 1, originalMeals, date);

    res.json({
      logged: { mealIndex, macros },
      consumed: adjustment.consumed,
      target: adjustment.target,
      remaining: adjustment.remaining,
      perMeal: adjustment.perMeal,
      loggedIndexes: adjustment.loggedIndexes,
      adjustedMeals: adjustment.meals
    });
  } catch (err) {
    process.stderr.write(`Meal log error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao registrar refeicao' });
  }
});

// GET /api/meals/logs/:date — Get all logs for a date
router.get('/logs/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const result = await query(
      'SELECT * FROM meal_logs WHERE user_id = $1 AND date = $2 ORDER BY meal_index',
      [req.userId, date]
    );

    const consumed = await getConsumedMacros(req.userId, date);
    const loggedIndexes = result.rows.map(r => r.meal_index);

    res.json({
      date,
      logs: result.rows,
      consumed,
      loggedIndexes
    });
  } catch (err) {
    process.stderr.write(`Get meal logs error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao buscar registros' });
  }
});

// GET /api/meals/memory — Nutritional memory summary
router.get('/memory', async (req, res) => {
  try {
    const memory = await buildNutritionMemory(req.userId, 30);
    res.json({ memory: memory || 'Sem historico suficiente ainda. Continue registrando suas refeicoes!' });
  } catch (err) {
    process.stderr.write(`Nutrition memory error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao carregar memoria nutricional' });
  }
});

// GET /api/meals/foods/search?q=fran — Search foods
router.get('/foods/search', async (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);

  const results = FOODS.filter(f =>
    f.name.toLowerCase().includes(q) || f.id.includes(q)
  ).slice(0, 10).map(f => ({
    foodId: f.id, name: f.name, serving: f.serving,
    kcal: f.kcal, prot: f.prot, carb: f.carb, fat: f.fat,
    preps: f.preps
  }));

  res.json(results);
});

// POST /api/meals/foods/ai-text — Estimate macros from text description
router.post('/foods/ai-text', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || description.length < 2) {
      return res.status(400).json({ error: 'Descricao do alimento e obrigatoria' });
    }
    const result = await estimateFromText(description);
    res.json(result);
  } catch (err) {
    process.stderr.write(`AI text endpoint error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao estimar macros' });
  }
});

// POST /api/meals/foods/ai-image — Estimate macros from photo
router.post('/foods/ai-image', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Imagem e obrigatoria (base64)' });
    }
    const result = await estimateFromImage(image, mimeType || 'image/jpeg');
    res.json(result);
  } catch (err) {
    process.stderr.write(`AI image endpoint error: ${err.message}\n`);
    res.status(500).json({ error: 'Erro ao analisar imagem' });
  }
});

export default router;
