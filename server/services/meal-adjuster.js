import { FOODS } from '../data/foods.js';
import { calcTMB, calcTDEE, calcMacros } from './nutrition.js';
import { query } from '../db.js';
import { chatCompletion, availableProviders } from './ai-client.js';

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

const ADJUSTER_PROMPT = `Voce e um nutricionista brasileiro especializado em reajuste de cardapios diarios.

REGRAS OBRIGATORIAS:
- Proteina pesada (carnes, peixes >150g) NAO deve ser servida no jantar apos 19h — prejudica sono e digestao
- Jantar deve ser LEVE: sopas, saladas, ovos, peixes leves em porcoes moderadas
- Ceia deve ser MINIMA: fruta leve, cha, iogurte — nunca mais que 100kcal
- Porcoes devem ser REALISTAS: ninguem come 3 latas de atum ou 360g de espinafre numa refeicao
- Maximo por porcao de proteina: 200g (carnes), 2 ovos extras, 1 lata de atum, 1 file de peixe
- Maximo de azeite: 2 colheres de sopa por refeicao
- Carboidratos complexos no almoco sao OK; no jantar reduzir pela metade
- Se o deficit e grande, distribuir em MAIS itens variados, nao inflar porcoes
- Preferir alimentos brasileiros comuns e acessiveis
- Se o objetivo e perda de peso e as calorias restantes sao altas, esta OK ficar ABAIXO da meta — nao force

Responda SOMENTE com JSON valido, sem markdown. Formato:
[
  {
    "mealIndex": 2,
    "type": "almoco",
    "name": "Almoco",
    "time": "12:30",
    "items": "Descricao item1 · Descricao item2 · ...",
    "itemDetails": [
      {"name":"Frango (peito)","serving":"150g","prep":"grelhado","kcal":248,"prot":37,"carb":0,"fat":5},
      ...
    ],
    "adjusted": true,
    "adjustNote": "Explicacao breve do ajuste"
  },
  ...
]

Retorne SOMENTE as refeicoes que precisam de ajuste. Nao retorne refeicoes que nao mudaram.`;

/**
 * Use AI to intelligently adjust remaining meals considering:
 * - Time of day and meal type
 * - Digestive impact (no heavy protein at dinner)
 * - Realistic portions
 * - Nutritional balance
 * - User's diet type and goal
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

  // Identify unlogged meals
  const unloggedMeals = [];
  for (let i = 0; i < originalMeals.length; i++) {
    if (!loggedIndexes.includes(i)) {
      unloggedMeals.push({ index: i, ...originalMeals[i] });
    }
  }

  if (unloggedMeals.length === 0) {
    return { meals: originalMeals, target, consumed, remaining, perMeal: null, loggedIndexes };
  }

  // Try AI adjustment (OpenAI → Groq fallback)
  if (availableProviders().length > 0) {
    try {
      const adjustedMeals = await aiAdjust(user, target, consumed, remaining, unloggedMeals, originalMeals);
      if (adjustedMeals) {
        return { meals: adjustedMeals, target, consumed, remaining, perMeal: null, loggedIndexes };
      }
    } catch (err) {
      process.stderr.write(`AI meal adjust error: ${err.message}\n`);
    }
  }

  // Fallback: return original meals unchanged (no bad scaling)
  return { meals: originalMeals, target, consumed, remaining, perMeal: null, loggedIndexes };
}

async function aiAdjust(user, target, consumed, remaining, unloggedMeals, originalMeals) {
  const userContext = `Perfil: ${user.sex === 'F' ? 'Mulher' : 'Homem'}, ${user.age} anos, ${user.weight}kg, ${user.height}cm. Dieta: ${user.diet_type}. Objetivo: ${user.diet_type === 'keto' ? 'cetose' : 'perda de peso com saude'}.`;

  const consumedText = `Ja consumido hoje: ${consumed.kcal}kcal, ${consumed.prot}g prot, ${consumed.carb}g carb, ${consumed.fat}g gord.`;
  const targetText = `Meta diaria: ${target.kcal}kcal, ${target.prot}g prot, ${target.carb}g carb, ${target.fat}g gord.`;
  const remainingText = `Restante para o dia: ${remaining.kcal}kcal, ${remaining.prot}g prot, ${remaining.carb}g carb, ${remaining.fat}g gord.`;

  const mealsText = unloggedMeals.map(m =>
    `[index:${m.index}] ${m.name} (${m.time}) - Atual: ${m.items} - Macros atuais: ${m.mealMacros?.kcal || '?'}kcal`
  ).join('\n');

  const prompt = `${userContext}
${targetText}
${consumedText}
${remainingText}

Refeicoes restantes do dia (nao logadas):
${mealsText}

Reajuste SOMENTE as refeicoes que precisam mudar para que o dia fique equilibrado. Respeite as regras nutricionais.`;

  const { text, provider } = await chatCompletion({
    messages: [
      { role: 'system', content: ADJUSTER_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    max_tokens: 1500
  });

  if (!text) return null;
  process.stderr.write(`Meal adjust by: ${provider}\n`);

  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const adjustedArr = JSON.parse(clean);
    if (!Array.isArray(adjustedArr)) return null;

    // Merge adjusted meals into originalMeals
    const result = [...originalMeals];
    for (const adj of adjustedArr) {
      const idx = adj.mealIndex;
      if (idx === undefined || idx < 0 || idx >= result.length) continue;

      // Calculate totals from itemDetails
      const details = adj.itemDetails || [];
      const totalKcal = details.reduce((s, d) => s + (d.kcal || 0), 0);
      const totalProt = details.reduce((s, d) => s + (d.prot || 0), 0);
      const totalCarb = details.reduce((s, d) => s + (d.carb || 0), 0);
      const totalFat = details.reduce((s, d) => s + (d.fat || 0), 0);

      result[idx] = {
        ...result[idx],
        items: adj.items || result[idx].items,
        itemDetails: details,
        mealMacros: { kcal: totalKcal, prot: totalProt, carb: totalCarb, fat: totalFat },
        adjusted: true,
        targetKcal: totalKcal,
        adjustNote: adj.adjustNote || null
      };
    }
    return result;
  } catch (e) {
    process.stderr.write(`AI adjust parse error: ${e.message}\nRaw: ${text}\n`);
    return null;
  }
}
