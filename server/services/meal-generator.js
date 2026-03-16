import { FOODS, MEAL_TEMPLATES, IF_FASTING_DAYS, DIET_TIPS, MEAL_NAMES, MEAL_TIMES } from '../data/foods.js';
import { calcTMB, calcTDEE, calcMacros } from './nutrition.js';

const DAY_NAMES = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

/**
 * Simple seeded PRNG (mulberry32).
 * Returns a function that produces deterministic floats in [0, 1).
 */
function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Map diet_type to the key used in DIET_MACROS / MEAL_TEMPLATES.
 */
function getDietKey(dietType) {
  if (dietType === 'if') return 'if';
  if (dietType === 'keto') return 'keto';
  if (dietType === 'carnivore') return 'carnivore';
  return 'normal';
}

/**
 * Map diet_type to the diet code used in FOODS.diets array.
 */
function getDietCode(dietType) {
  const map = { normal: 'N', keto: 'K', carnivore: 'C', if: 'IF' };
  return map[dietType] || 'N';
}

/**
 * Check if a given day number (1=Mon..7=Sun) is a fasting day for this week.
 */
function isFastingDay(weekNum, dayOfWeek) {
  const fastDays = IF_FASTING_DAYS[weekNum] || IF_FASTING_DAYS[4] || [];
  return fastDays.includes(dayOfWeek);
}

/**
 * Select a food from available options using the PRNG, prioritizing favorites.
 */
function pickFood(available, rng, favorites, used) {
  if (available.length === 0) return null;

  // Separate favorites from the rest
  const favFoods = available.filter(f => favorites.includes(f.id) && !used.has(f.id));
  const otherFoods = available.filter(f => !favorites.includes(f.id) && !used.has(f.id));
  const fallback = available.filter(f => !used.has(f.id));

  let pool;
  // 60% chance to pick from favorites if available
  if (favFoods.length > 0 && rng() < 0.6) {
    pool = favFoods;
  } else if (otherFoods.length > 0) {
    pool = otherFoods;
  } else if (fallback.length > 0) {
    pool = fallback;
  } else {
    pool = available; // last resort: allow repeats
  }

  const idx = Math.floor(rng() * pool.length);
  return pool[idx];
}

/**
 * Get available foods for a category, filtered by diet and restrictions.
 */
function getAvailable(cat, dietCode, restrictions, slotKey) {
  // Map slot keys to slot tags for filtering
  const slotMap = {
    cafe: 'cafe', lanche_manha: 'lanche', lanche_tarde: 'lanche', lanche: 'lanche',
    almoco: 'almoco', jantar: 'jantar', ceia: 'ceia',
    quebra_jejum: 'cafe', principal: 'almoco', primeira: 'cafe', ultima: 'jantar'
  };
  const slotTag = slotMap[slotKey] || 'almoco';

  const filtered = FOODS.filter(f =>
    f.cat === cat &&
    f.diets.includes(dietCode) &&
    !restrictions.includes(f.id) &&
    (!f.slots || f.slots.includes(slotTag))
  );
  // If slot filtering is too restrictive, fall back to diet-only filter
  if (filtered.length === 0) {
    return FOODS.filter(f => f.cat === cat && f.diets.includes(dietCode) && !restrictions.includes(f.id));
  }
  return filtered;
}

/**
 * Build a meal from a template slot.
 */
function buildMeal(slot, slotKey, dietCode, rng, favorites, restrictions, usedToday) {
  const items = [];
  let hasGH = false;

  for (const catSpec of slot.structure) {
    // Handle "fruit|fat" alternative categories
    const cats = catSpec.split('|');
    const chosenCat = cats[Math.floor(rng() * cats.length)];

    const available = getAvailable(chosenCat, dietCode, restrictions, slotKey);
    const food = pickFood(available, rng, favorites, usedToday);

    if (food) {
      usedToday.add(food.id);
      const prep = food.preps[Math.floor(rng() * food.preps.length)];
      items.push(`${food.name} (${food.serving}) — ${prep}`);
      if (food.tags.includes('gh')) {
        hasGH = true;
      }
    }
  }

  if (slot.drink) {
    items.push(slot.drink);
  }

  return {
    type: slotKey,
    time: MEAL_TIMES[slotKey] || '12:00',
    name: MEAL_NAMES[slotKey] || slotKey,
    items: items.join(' · '),
    gh: hasGH
  };
}

/**
 * Calculate approximate macros for a day based on target and meal count.
 */
function calcDayMacros(targetMacros) {
  return {
    kcal: targetMacros.kcal,
    prot: targetMacros.prot,
    carb: targetMacros.carb,
    fat: targetMacros.fat
  };
}

/**
 * Generate a full week meal plan for a user.
 * @param {object} user - User profile from DB
 * @param {number} weekNum - Week number (1-4)
 * @returns {Array} Array of 7 day objects
 */
export function generateWeekPlan(user, weekNum) {
  const sex = user.sex || 'M';
  const weight = Number(user.weight) || 75;
  const height = Number(user.height) || 175;
  const age = Number(user.age) || 30;
  const activityLevel = user.activity_level || 'moderate';
  const dietType = user.diet_type || 'normal';
  const favorites = user.favorites || [];
  const restrictions = user.restrictions || [];

  const tmb = calcTMB(sex, weight, height, age);
  const tdee = calcTDEE(tmb, activityLevel);
  const targetMacros = calcMacros(tdee, dietType === 'if' ? 'if' : dietType);

  const dietKey = getDietKey(dietType);
  const dietCode = getDietCode(dietType);
  const tips = DIET_TIPS[dietKey] || DIET_TIPS.normal;

  const days = [];

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const seed = (weekNum * 1000) + (dayNum * 100) + (user.id || 0);
    const rng = seededRandom(seed);
    const usedToday = new Set();

    const fasting = dietType === 'if' && isFastingDay(weekNum, dayNum);

    // Select meal template
    let templateKey;
    if (dietType === 'if') {
      templateKey = fasting ? 'if_fasting' : 'if_normal';
    } else {
      templateKey = dietKey;
    }

    const template = MEAL_TEMPLATES[templateKey];
    const meals = [];

    for (const [slotKey, slot] of Object.entries(template)) {
      const meal = buildMeal(slot, slotKey, dietCode, rng, favorites, restrictions, usedToday);
      meals.push(meal);
    }

    const tipIndex = ((weekNum - 1) * 7 + (dayNum - 1)) % tips.length;

    days.push({
      dayNum,
      dayName: `${DAY_NAMES[dayNum - 1]} · Dia ${(weekNum - 1) * 7 + dayNum}`,
      fasting,
      macros: calcDayMacros(targetMacros),
      meals,
      tip: tips[tipIndex]
    });
  }

  return days;
}
