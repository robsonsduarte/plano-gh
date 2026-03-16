import { FOODS, MEAL_TEMPLATES, IF_FASTING_DAYS } from '../data/foods.js';
import { calcTMB, calcTDEE, calcMacros } from './nutrition.js';
import { query } from '../db.js';

/**
 * Resolve macros from an array of logged items.
 */
export function resolveMacros(loggedItems) {
  let kcal = 0, prot = 0, carb = 0, fat = 0;
  for (const item of loggedItems) {
    const food = FOODS.find(f => f.id === item.foodId);
    if (food) { kcal += food.kcal; prot += food.prot; carb += food.carb; fat += food.fat; }
    else { kcal += item.kcal || 0; prot += item.prot || 0; carb += item.carb || 0; fat += item.fat || 0; }
  }
  return { kcal: Math.round(kcal), prot: Math.round(prot), carb: Math.round(carb), fat: Math.round(fat) };
}

export async function getConsumedMacros(userId, date) {
  const result = await query(
    `SELECT COALESCE(SUM(total_kcal),0) as kcal, COALESCE(SUM(total_prot),0) as prot,
            COALESCE(SUM(total_carb),0) as carb, COALESCE(SUM(total_fat),0) as fat
     FROM meal_logs WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  const row = result.rows[0];
  return { kcal: Number(row.kcal), prot: Number(row.prot), carb: Number(row.carb), fat: Number(row.fat) };
}

export async function getLoggedMealIndexes(userId, date) {
  const result = await query(
    'SELECT meal_index FROM meal_logs WHERE user_id = $1 AND date = $2',
    [userId, date]
  );
  return result.rows.map(r => r.meal_index);
}

// Meal types that should NOT be adjusted (light meals by nature)
const FIXED_MEAL_TYPES = ['ceia', 'lanche_manha'];

/**
 * Adjust remaining meals by scaling portions of existing items.
 * Ceia and snacks are never adjusted.
 * Main meals (almoco, jantar, lanche_tarde) get proportionally scaled.
 */
export async function adjustDayMeals(user, weekNum, dayNum, originalMeals) {
  const date = new Date().toISOString().split('T')[0];
  const consumed = await getConsumedMacros(user.id, date);
  const loggedIndexes = await getLoggedMealIndexes(user.id, date);

  const tmb = calcTMB(user.sex || 'M', Number(user.weight) || 75, Number(user.height) || 175, Number(user.age) || 30);
  const tdee = calcTDEE(tmb, user.activity_level || 'moderate');
  const target = calcMacros(tdee, user.diet_type === 'if' ? 'if' : (user.diet_type || 'normal'));

  const remaining = {
    kcal: Math.max(0, target.kcal - consumed.kcal),
    prot: Math.max(0, target.prot - consumed.prot),
    carb: Math.max(0, target.carb - consumed.carb),
    fat: Math.max(0, target.fat - consumed.fat)
  };

  // Identify adjustable meals (unlogged AND not a fixed type)
  const adjustableIndexes = [];
  const fixedUnloggedIndexes = [];
  for (let i = 0; i < originalMeals.length; i++) {
    if (loggedIndexes.includes(i)) continue;
    const mealType = originalMeals[i]?.type || '';
    if (FIXED_MEAL_TYPES.includes(mealType)) {
      fixedUnloggedIndexes.push(i);
    } else {
      adjustableIndexes.push(i);
    }
  }

  if (adjustableIndexes.length === 0) {
    return { meals: originalMeals, target, consumed, remaining, perMeal: null, loggedIndexes };
  }

  // Calculate kcal budget for fixed meals (ceia, snacks) — they keep original kcal
  let fixedKcal = 0;
  for (const idx of fixedUnloggedIndexes) {
    const meal = originalMeals[idx];
    fixedKcal += meal?.mealMacros?.kcal || 0;
  }

  // Remaining kcal after subtracting fixed meals
  const adjustableRemaining = Math.max(0, remaining.kcal - fixedKcal);

  const perMeal = {
    kcal: Math.round(adjustableRemaining / adjustableIndexes.length),
    prot: Math.round(remaining.prot / adjustableIndexes.length),
    carb: Math.round(remaining.carb / adjustableIndexes.length),
    fat: Math.round(remaining.fat / adjustableIndexes.length)
  };

  // Scale each adjustable meal's portions to hit the per-meal target
  const adjustedMeals = originalMeals.map((meal, idx) => {
    if (loggedIndexes.includes(idx)) return meal; // logged — keep as is
    if (!adjustableIndexes.includes(idx)) return meal; // fixed type — keep as is

    const currentKcal = meal.mealMacros?.kcal || 0;
    if (currentKcal === 0) return meal;

    const scaleFactor = perMeal.kcal / currentKcal;

    // Don't scale if difference is less than 15% — not worth adjusting
    if (Math.abs(scaleFactor - 1) < 0.15) return meal;

    // Scale itemDetails portions
    const scaledDetails = (meal.itemDetails || []).map(item => {
      const newKcal = Math.round(item.kcal * scaleFactor);
      const newProt = Math.round(item.prot * scaleFactor);
      const newCarb = Math.round(item.carb * scaleFactor);
      const newFat = Math.round(item.fat * scaleFactor);
      const newServing = scaleServing(item.serving, scaleFactor);
      return { ...item, kcal: newKcal, prot: newProt, carb: newCarb, fat: newFat, serving: newServing };
    });

    // Rebuild items string with scaled portions
    const scaledItems = scaledDetails.map(d =>
      `${d.name} (${d.serving}) — ${d.prep}`
    ).join(' · ');

    const scaledKcal = scaledDetails.reduce((s, d) => s + d.kcal, 0);
    const scaledProt = scaledDetails.reduce((s, d) => s + d.prot, 0);
    const scaledCarb = scaledDetails.reduce((s, d) => s + d.carb, 0);
    const scaledFat = scaledDetails.reduce((s, d) => s + d.fat, 0);

    return {
      ...meal,
      items: scaledItems,
      itemDetails: scaledDetails,
      mealMacros: { kcal: scaledKcal, prot: scaledProt, carb: scaledCarb, fat: scaledFat },
      adjusted: true,
      targetKcal: perMeal.kcal
    };
  });

  return { meals: adjustedMeals, target, consumed, remaining, perMeal, loggedIndexes };
}

/**
 * Scale a serving string by a factor.
 * "160g" * 1.5 = "240g"
 * "3 colheres" * 0.7 = "2 colheres"
 * "1 unidade" * 1.3 = "1.3 unidades"
 * "1/3 unidade" * 1.5 = "1/2 unidade"
 */
function scaleServing(serving, factor) {
  if (!serving || factor === 1) return serving;

  // Try "Xg" pattern
  const gMatch = serving.match(/^(\d+)\s*g$/);
  if (gMatch) {
    return Math.round(Number(gMatch[1]) * factor) + 'g';
  }

  // Try "X colheres" or "X fatias" etc
  const numUnitMatch = serving.match(/^([\d.]+)\s+(.+)$/);
  if (numUnitMatch) {
    const num = Number(numUnitMatch[1]);
    const unit = numUnitMatch[2];
    const scaled = Math.round(num * factor * 10) / 10;
    return `${scaled} ${unit}`;
  }

  // Try "1/X unidade"
  const fracMatch = serving.match(/^(\d+)\/(\d+)\s+(.+)$/);
  if (fracMatch) {
    const frac = Number(fracMatch[1]) / Number(fracMatch[2]);
    const scaled = Math.round(frac * factor * 10) / 10;
    const unit = fracMatch[3];
    return `${scaled} ${unit}`;
  }

  // Fallback: prefix with scale hint
  if (factor > 1.2) return serving + ' (porcao maior)';
  if (factor < 0.8) return serving + ' (porcao menor)';
  return serving;
}
