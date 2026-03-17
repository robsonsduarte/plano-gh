import { query } from '../db.js';

/**
 * Build a nutritional memory context for the AI.
 * Analyzes the user's meal log history + tracking to provide:
 * - Top foods they actually eat (real preferences)
 * - Meal-by-meal adherence patterns
 * - Macro averages vs targets
 * - Weight trend (if tracking data exists)
 * - Foods they never log (implicit rejections)
 */
export async function buildNutritionMemory(userId, daysBack = 14) {
  const [logsResult, trackingResult, frequentFoods, mealPatterns] = await Promise.all([
    // Daily macro totals for the period
    query(
      `SELECT date, SUM(total_kcal) as kcal, SUM(total_prot) as prot,
              SUM(total_carb) as carb, SUM(total_fat) as fat, COUNT(*) as meals_logged
       FROM meal_logs WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int
       GROUP BY date ORDER BY date DESC`,
      [userId, daysBack]
    ),
    // Weight tracking
    query(
      `SELECT date, weight FROM tracking WHERE user_id = $1 AND weight IS NOT NULL
       AND date >= CURRENT_DATE - $2::int ORDER BY date DESC LIMIT 10`,
      [userId, daysBack]
    ),
    // Most logged food items (from JSONB logged_items)
    query(
      `SELECT item->>'name' as food_name, COUNT(*) as times,
              ROUND(AVG((item->>'kcal')::numeric)) as avg_kcal
       FROM meal_logs, jsonb_array_elements(logged_items) as item
       WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int
       AND item->>'name' IS NOT NULL
       GROUP BY item->>'name' ORDER BY times DESC LIMIT 15`,
      [userId, daysBack]
    ),
    // Meal type patterns (what time slots they actually log)
    query(
      `SELECT meal_type, COUNT(*) as times,
              ROUND(AVG(total_kcal)) as avg_kcal
       FROM meal_logs WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int
       GROUP BY meal_type ORDER BY times DESC`,
      [userId, daysBack]
    ),
  ]);

  const logs = logsResult.rows;
  const tracking = trackingResult.rows;
  const foods = frequentFoods.rows;
  const patterns = mealPatterns.rows;

  // No history — return empty
  if (logs.length === 0) return null;

  // Calc averages
  const totalDays = logs.length;
  const avgKcal = Math.round(logs.reduce((s, r) => s + Number(r.kcal), 0) / totalDays);
  const avgProt = Math.round(logs.reduce((s, r) => s + Number(r.prot), 0) / totalDays);
  const avgCarb = Math.round(logs.reduce((s, r) => s + Number(r.carb), 0) / totalDays);
  const avgFat = Math.round(logs.reduce((s, r) => s + Number(r.fat), 0) / totalDays);
  const avgMeals = (logs.reduce((s, r) => s + Number(r.meals_logged), 0) / totalDays).toFixed(1);

  // Weight trend
  let weightTrend = null;
  if (tracking.length >= 2) {
    const latest = Number(tracking[0].weight);
    const oldest = Number(tracking[tracking.length - 1].weight);
    const diff = latest - oldest;
    weightTrend = {
      current: latest,
      change: diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1),
      direction: diff < -0.3 ? 'perdendo' : diff > 0.3 ? 'ganhando' : 'estavel',
      days: tracking.length,
    };
  }

  // Top foods
  const topFoods = foods.map(f => `${f.food_name} (${f.times}x, ~${f.avg_kcal}kcal)`).join(', ');

  // Meal adherence
  const mealAdherence = patterns.map(p => `${p.meal_type}: ${p.times}x, media ${p.avg_kcal}kcal`).join('; ');

  // Build context string
  let context = `MEMORIA NUTRICIONAL (ultimos ${totalDays} dias com dados):`;
  context += `\n- Media diaria: ${avgKcal}kcal, ${avgProt}g prot, ${avgCarb}g carb, ${avgFat}g gord`;
  context += `\n- Media de refeicoes logadas/dia: ${avgMeals}`;

  if (topFoods) {
    context += `\n- Alimentos mais consumidos: ${topFoods}`;
  }

  if (mealAdherence) {
    context += `\n- Padrao por refeicao: ${mealAdherence}`;
  }

  if (weightTrend) {
    context += `\n- Peso: ${weightTrend.current}kg (${weightTrend.change}kg em ${weightTrend.days} registros, tendencia: ${weightTrend.direction})`;
  }

  // Adherence assessment
  const adherenceRate = Math.round((totalDays / daysBack) * 100);
  context += `\n- Aderencia ao registro: ${adherenceRate}% dos dias (${totalDays}/${daysBack})`;

  if (adherenceRate < 40) {
    context += `\n- ATENCAO: Baixa aderencia — sugira refeicoes mais praticas e faceis de preparar`;
  }

  return context;
}
