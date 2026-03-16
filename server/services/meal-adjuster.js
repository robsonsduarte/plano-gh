import { FOODS, MEAL_TEMPLATES, MEAL_NAMES, MEAL_TIMES, IF_FASTING_DAYS, DIET_TIPS } from '../data/foods.js';
import { calcTMB, calcTDEE, calcMacros } from './nutrition.js';
import { query } from '../db.js';
import { buildMeal, seededRandom } from './meal-generator.js';

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
  return { kcal: Number(row.kcal), prot: Number(row.prot), carb: Number(row.carb), fat: Number(row.fat) };
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

function getDietKey(dt) { return dt === 'if' ? 'if' : (dt || 'normal'); }
function getDietCode(dt) { return { normal:'N', keto:'K', carnivore:'C', if:'N' }[dt] || 'N'; }

/**
 * Regenerate remaining (unlogged) meals to fit the adjusted calorie budget.
 * Returns the full day's meals array with logged meals preserved and pending meals regenerated.
 */
export async function adjustDayMeals(user, weekNum, dayNum, originalMeals) {
  const date = new Date().toISOString().split('T')[0];
  const consumed = await getConsumedMacros(user.id, date);
  const loggedIndexes = await getLoggedMealIndexes(user.id, date);

  const tmb = calcTMB(user.sex || 'M', Number(user.weight) || 75, Number(user.height) || 175, Number(user.age) || 30);
  const tdee = calcTDEE(tmb, user.activity_level || 'moderate');
  const target = calcMacros(tdee, getDietKey(user.diet_type));

  const remaining = {
    kcal: Math.max(0, target.kcal - consumed.kcal),
    prot: Math.max(0, target.prot - consumed.prot),
    carb: Math.max(0, target.carb - consumed.carb),
    fat: Math.max(0, target.fat - consumed.fat)
  };

  const unloggedIndexes = [];
  for (let i = 0; i < originalMeals.length; i++) {
    if (!loggedIndexes.includes(i)) unloggedIndexes.push(i);
  }

  if (unloggedIndexes.length === 0) {
    return { meals: originalMeals, target, consumed, remaining, perMeal: null, loggedIndexes };
  }

  const perMeal = {
    kcal: Math.round(remaining.kcal / unloggedIndexes.length),
    prot: Math.round(remaining.prot / unloggedIndexes.length),
    carb: Math.round(remaining.carb / unloggedIndexes.length),
    fat: Math.round(remaining.fat / unloggedIndexes.length)
  };

  // Regenerate unlogged meals with a different seed (original seed + 9999) for variety
  const dietType = user.diet_type || 'normal';
  const dietCode = getDietCode(dietType);
  const dietKey = getDietKey(dietType);
  const fasting = dietType === 'if' && (IF_FASTING_DAYS[weekNum] || []).includes(dayNum);
  let templateKey;
  if (dietType === 'if') { templateKey = fasting ? 'if_fasting' : 'if_normal'; }
  else { templateKey = dietKey; }
  const template = MEAL_TEMPLATES[templateKey];
  const templateEntries = Object.entries(template);
  const favorites = user.favorites || [];
  const restrictions = user.restrictions || [];

  const adjustedMeals = [...originalMeals];

  for (const idx of unloggedIndexes) {
    // Use a unique seed per adjustment so foods change
    const adjustSeed = (weekNum * 1000) + (dayNum * 100) + (user.id || 0) + 9999 + idx * 77;
    const rng = seededRandom(adjustSeed);
    const usedToday = new Set();

    // Get the template slot for this meal index
    const slotEntry = templateEntries[idx];
    if (!slotEntry) continue;
    const [slotKey, slot] = slotEntry;

    const newMeal = buildMeal(slot, slotKey, dietCode, rng, favorites, restrictions, usedToday);
    // Annotate with adjustment info
    newMeal.adjusted = true;
    newMeal.targetKcal = perMeal.kcal;

    adjustedMeals[idx] = newMeal;
  }

  return { meals: adjustedMeals, target, consumed, remaining, perMeal, loggedIndexes };
}
