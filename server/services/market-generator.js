import { FOODS, MEAL_TEMPLATES, IF_FASTING_DAYS } from '../data/foods.js';
import { generateWeekPlan } from './meal-generator.js';

const CATEGORY_META = {
  protein:   { icon: '\uD83E\uDD69', name: 'Proteinas' },
  vegetable: { icon: '\uD83E\uDD66', name: 'Vegetais' },
  fruit:     { icon: '\uD83C\uDF53', name: 'Frutas' },
  carb:      { icon: '\uD83C\uDF5A', name: 'Carboidratos' },
  fat:       { icon: '\uD83E\uDD51', name: 'Gorduras Saudaveis' }
};

const FOOD_MAP = new Map(FOODS.map(f => [f.id, f]));

/**
 * Extract food IDs referenced in a meal plan's item strings.
 * We match by food name since items are formatted as "Name (serving) - prep".
 */
function extractFoodsFromPlan(weekPlan) {
  const counts = new Map();

  for (const day of weekPlan) {
    for (const meal of day.meals) {
      const itemParts = meal.items.split(' · ');
      for (const part of itemParts) {
        // Match food by name prefix
        for (const food of FOODS) {
          if (part.startsWith(food.name)) {
            const current = counts.get(food.id) || 0;
            counts.set(food.id, current + 1);
            break;
          }
        }
      }
    }
  }

  return counts;
}

/**
 * Calculate a human-readable weekly quantity from number of meal appearances.
 */
function calcQuantity(food, appearances) {
  const serving = food.serving;

  // For items measured in grams, multiply
  const gramMatch = serving.match(/(\d+)g/);
  if (gramMatch) {
    const grams = Number(gramMatch[1]) * appearances;
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)}kg`;
    }
    return `${grams}g`;
  }

  // For items measured in units
  const unitMatch = serving.match(/(\d+)\s*(unidade|lata|fatia|dose|colher)/i);
  if (unitMatch) {
    const total = Number(unitMatch[1]) * appearances;
    const unit = unitMatch[2].toLowerCase();
    if (unit === 'unidade') return `${total} unidades`;
    if (unit === 'lata') return `${total} latas`;
    if (unit === 'fatia') return `${total} fatias`;
    if (unit === 'dose') return `${total} doses`;
    if (unit === 'colher') return `${total} colheres`;
    return `${total}x ${serving}`;
  }

  // For fractional servings like "1/3 unidade"
  const fracMatch = serving.match(/(\d+)\/(\d+)\s*(unidade)/i);
  if (fracMatch) {
    const frac = Number(fracMatch[1]) / Number(fracMatch[2]);
    const total = Math.ceil(frac * appearances);
    return `${total} unidades`;
  }

  // For "1 media" style
  if (serving.includes('media') || serving.includes('unidade')) {
    return `${appearances} unidades`;
  }

  // Fallback
  return `${appearances}x ${serving}`;
}

/**
 * Generate a shopping list from the user's meal plan for a given week.
 * @param {object} user - User profile
 * @param {number} weekNum - Week number (1-4)
 * @returns {{ categories: Array<{ icon: string, name: string, items: Array }> }}
 */
export function generateMarketList(user, weekNum) {
  const weekPlan = generateWeekPlan(user, weekNum);
  const foodCounts = extractFoodsFromPlan(weekPlan);

  // Group by category
  const grouped = {};
  for (const [foodId, count] of foodCounts.entries()) {
    const food = FOOD_MAP.get(foodId);
    if (!food) continue;

    if (!grouped[food.cat]) {
      grouped[food.cat] = [];
    }

    grouped[food.cat].push({
      id: food.id,
      name: food.name,
      quantity: calcQuantity(food, count),
      gh: food.tags.includes('gh')
    });
  }

  // Build categories array in display order
  const catOrder = ['protein', 'vegetable', 'fruit', 'carb', 'fat'];
  const categories = [];

  for (const cat of catOrder) {
    if (grouped[cat] && grouped[cat].length > 0) {
      const meta = CATEGORY_META[cat];
      // Sort: GH items first, then alphabetical
      grouped[cat].sort((a, b) => {
        if (a.gh && !b.gh) return -1;
        if (!a.gh && b.gh) return 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });

      categories.push({
        icon: meta.icon,
        name: meta.name,
        items: grouped[cat]
      });
    }
  }

  return { categories };
}
