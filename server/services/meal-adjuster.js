import { FOODS } from '../data/foods.js';
import { calcTMB, calcTDEE, calcMacros } from './nutrition.js';
import { query } from '../db.js';

/**
 * Resolve macros from an array of logged items.
 * Each item: { foodId, name, serving, prep, [kcal, prot, carb, fat] }
 * If foodId matches FOODS, use DB macros. Otherwise use provided values.
 */
export function resolveMacros(loggedItems) {
  let kcal = 0, prot = 0, carb = 0, fat = 0;

  for (const item of loggedItems) {
    const food = FOODS.find(f => f.id === item.foodId);
    if (food) {
      kcal += food.kcal;
      prot += food.prot;
      carb += food.carb;
      fat += food.fat;
    } else {
      // Custom item — use provided macros or zero
      kcal += item.kcal || 0;
      prot += item.prot || 0;
      carb += item.carb || 0;
      fat += item.fat || 0;
    }
  }

  return { kcal: Math.round(kcal), prot: Math.round(prot), carb: Math.round(carb), fat: Math.round(fat) };
}

/**
 * Get total consumed macros for a user on a given date.
 */
export async function getConsumedMacros(userId, date) {
  const result = await query(
    `SELECT COALESCE(SUM(total_kcal),0) as kcal, COALESCE(SUM(total_prot),0) as prot,
            COALESCE(SUM(total_carb),0) as carb, COALESCE(SUM(total_fat),0) as fat
     FROM meal_logs WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  const row = result.rows[0];
  return {
    kcal: Number(row.kcal), prot: Number(row.prot),
    carb: Number(row.carb), fat: Number(row.fat)
  };
}

/**
 * Get which meal indexes have been logged for a user+date.
 */
export async function getLoggedMealIndexes(userId, date) {
  const result = await query(
    'SELECT meal_index FROM meal_logs WHERE user_id = $1 AND date = $2',
    [userId, date]
  );
  return result.rows.map(r => r.meal_index);
}

/**
 * Calculate remaining macros and per-meal targets for unlogged meals.
 */
export function calcRemainingTargets(user, consumed, totalMeals, loggedIndexes) {
  const tmb = calcTMB(user.sex || 'M', Number(user.weight) || 75, Number(user.height) || 175, Number(user.age) || 30);
  const tdee = calcTDEE(tmb, user.activity_level || 'moderate');
  const target = calcMacros(tdee, user.diet_type === 'if' ? 'if' : (user.diet_type || 'normal'));

  const remaining = {
    kcal: Math.max(0, target.kcal - consumed.kcal),
    prot: Math.max(0, target.prot - consumed.prot),
    carb: Math.max(0, target.carb - consumed.carb),
    fat: Math.max(0, target.fat - consumed.fat)
  };

  const unloggedCount = totalMeals - loggedIndexes.length;
  if (unloggedCount <= 0) {
    return { target, consumed, remaining, perMeal: null };
  }

  const perMeal = {
    kcal: Math.round(remaining.kcal / unloggedCount),
    prot: Math.round(remaining.prot / unloggedCount),
    carb: Math.round(remaining.carb / unloggedCount),
    fat: Math.round(remaining.fat / unloggedCount)
  };

  return { target, consumed, remaining, perMeal };
}
