/**
 * Score quiz answers and recommend a diet type.
 * @param {object} answers - Quiz answers keyed by question id (q1..q10)
 * @returns {{ recommended: string, scores: object, explanation: string }}
 */
export function scoreQuiz(answers) {
  const scores = { normal: 50, keto: 50, carnivore: 50, if: 50 };
  const factors = [];

  // Q1: Confidence to follow a plan (1-5)
  const q1 = Number(answers.q1) || 3;
  if (q1 >= 5) {
    scores.keto += 15; scores.carnivore += 12; scores.if += 13; scores.normal += 8;
    factors.push('Alta confianca para seguir planos restritivos');
  } else if (q1 >= 3) {
    scores.keto += 8; scores.carnivore += 6; scores.if += 8; scores.normal += 8;
  } else {
    scores.keto += 0; scores.carnivore -= 5; scores.if += 0; scores.normal += 3;
    factors.push('Baixa confianca favorece dietas mais flexiveis');
  }

  // Q2: Emotional eating (always/often/sometimes/rarely/never)
  const q2 = answers.q2 || 'sometimes';
  if (q2 === 'always' || q2 === 'often') {
    scores.keto -= 10; scores.carnivore -= 8; scores.if -= 10; scores.normal += 5;
    factors.push('Tendencia a comer emocional requer abordagem equilibrada');
  } else if (q2 === 'never' || q2 === 'rarely') {
    scores.keto += 10; scores.carnivore += 8; scores.if += 10; scores.normal += 5;
    factors.push('Bom controle emocional alimentar');
  } else {
    scores.keto += 3; scores.carnivore += 2; scores.if += 3; scores.normal += 5;
  }

  // Q3: Daily schedule (predictable/regular/variable/flexible)
  const q3 = answers.q3 || 'regular';
  if (q3 === 'predictable') {
    scores.if += 25; scores.normal += 15; scores.keto += 12; scores.carnivore += 8;
    factors.push('Rotina previsivel favorece jejum intermitente');
  } else if (q3 === 'regular') {
    scores.if += 15; scores.normal += 12; scores.keto += 10; scores.carnivore += 8;
  } else if (q3 === 'variable') {
    scores.normal += 20; scores.if += 5; scores.keto += 10; scores.carnivore += 8;
    factors.push('Rotina variavel favorece dieta flexivel');
  } else {
    scores.normal += 15; scores.if += 8; scores.keto += 8; scores.carnivore += 6;
  }

  // Q4: Cooking frequency (daily/4-5x/2-3x/rarely)
  const q4 = answers.q4 || '2-3x';
  if (q4 === 'daily') {
    scores.normal += 15; scores.keto += 15; scores.carnivore += 12; scores.if += 12;
  } else if (q4 === '4-5x') {
    scores.normal += 12; scores.keto += 12; scores.carnivore += 10; scores.if += 10;
  } else if (q4 === '2-3x') {
    scores.normal += 8; scores.keto += 5; scores.carnivore += 3; scores.if += 8;
  } else {
    scores.if += 18; scores.normal += 8; scores.keto += 0; scores.carnivore -= 5;
    factors.push('Pouco tempo para cozinhar favorece menos refeicoes');
  }

  // Q5: Breakfast habit (love/habit/skip_often/never_eat)
  const q5 = answers.q5 || 'habit';
  if (q5 === 'never_eat' || q5 === 'skip_often') {
    scores.if += 25; scores.normal += 0; scores.keto += 5; scores.carnivore += 5;
    factors.push('Ja pula o cafe da manha naturalmente — ideal para jejum');
  } else if (q5 === 'love') {
    scores.if -= 15; scores.normal += 10; scores.keto += 8; scores.carnivore += 5;
    factors.push('Ama o cafe da manha — jejum pode ser desafiador');
  } else {
    scores.normal += 5; scores.keto += 5; scores.carnivore += 3; scores.if += 5;
  }

  // Q6: Relationship with meat (love/regular/moderate/prefer_less)
  const q6 = answers.q6 || 'regular';
  if (q6 === 'love') {
    scores.carnivore += 25; scores.keto += 15; scores.normal += 5; scores.if += 5;
    factors.push('Forte afinidade com carnes favorece dietas proteicas');
  } else if (q6 === 'regular') {
    scores.carnivore += 8; scores.keto += 10; scores.normal += 10; scores.if += 8;
  } else if (q6 === 'moderate') {
    scores.carnivore -= 10; scores.keto += 5; scores.normal += 12; scores.if += 8;
  } else {
    scores.carnivore -= 30; scores.keto -= 5; scores.normal += 15; scores.if += 10;
    factors.push('Preferencia por menos carne desqualifica dieta carnivora');
  }

  // Q7: Food variety (need_variety/like_but_accept/prefer_same)
  const q7 = answers.q7 || 'like_but_accept';
  if (q7 === 'need_variety') {
    scores.normal += 20; scores.carnivore -= 15; scores.keto += 5; scores.if += 10;
    factors.push('Necessidade de variedade favorece dieta equilibrada');
  } else if (q7 === 'prefer_same') {
    scores.carnivore += 15; scores.keto += 10; scores.normal += 5; scores.if += 5;
    factors.push('Conforto com repeticao favorece dietas mais restritivas');
  } else {
    scores.normal += 10; scores.keto += 8; scores.carnivore += 5; scores.if += 8;
  }

  // Q8: Comfortable tracking macros (yes/can_do/no)
  const q8 = answers.q8 || 'can_do';
  if (q8 === 'yes') {
    scores.keto += 20; scores.normal += 10; scores.if += 10; scores.carnivore += 5;
    factors.push('Disposto a rastrear macros — viabiliza dietas com controle rigoroso');
  } else if (q8 === 'can_do') {
    scores.keto += 8; scores.normal += 8; scores.if += 8; scores.carnivore += 5;
  } else {
    scores.keto -= 15; scores.carnivore += 10; scores.if += 10; scores.normal += 5;
    factors.push('Nao quer contar macros — dietas simples sao melhores');
  }

  // Q9: Family support (yes/partial/no)
  const q9 = answers.q9 || 'partial';
  if (q9 === 'yes') {
    scores.normal += 10; scores.keto += 15; scores.carnivore += 12; scores.if += 10;
    factors.push('Apoio familiar facilita qualquer dieta');
  } else if (q9 === 'partial') {
    scores.normal += 8; scores.keto += 5; scores.carnivore += 0; scores.if += 8;
  } else {
    scores.carnivore -= 25; scores.keto -= 20; scores.normal += 5; scores.if += 5;
    factors.push('Sem apoio familiar — dietas radicais sao dificeis de manter');
  }

  // Q10: Main goal (lose_fast/lose_gradual/gain_muscle/energy/digestive)
  const q10 = answers.q10 || 'lose_gradual';
  if (q10 === 'lose_fast') {
    scores.keto += 20; scores.if += 15; scores.carnivore += 10; scores.normal += 5;
    factors.push('Objetivo de perda rapida favorece keto e jejum');
  } else if (q10 === 'lose_gradual') {
    scores.normal += 15; scores.if += 12; scores.keto += 8; scores.carnivore += 5;
    factors.push('Perda gradual favorece abordagem equilibrada');
  } else if (q10 === 'gain_muscle') {
    scores.normal += 20; scores.carnivore += 15; scores.keto += 5; scores.if += 5;
    factors.push('Ganho muscular requer bom aporte de carboidratos e proteinas');
  } else if (q10 === 'energy') {
    scores.if += 15; scores.keto += 12; scores.normal += 10; scores.carnivore += 8;
    factors.push('Foco em energia favorece jejum e cetose');
  } else if (q10 === 'digestive') {
    scores.carnivore += 25; scores.keto += 10; scores.normal += 5; scores.if += 5;
    factors.push('Problemas digestivos podem melhorar com eliminacao de vegetais e graos');
  }

  // Normalize scores to 0-100
  const allValues = Object.values(scores);
  const minScore = Math.min(...allValues);
  const maxScore = Math.max(...allValues);
  const range = maxScore - minScore || 1;

  const normalized = {};
  for (const [key, val] of Object.entries(scores)) {
    normalized[key] = Math.round(((val - minScore) / range) * 100);
  }

  // Find recommended diet
  let recommended = 'normal';
  let highestRaw = scores.normal;
  for (const [key, val] of Object.entries(scores)) {
    if (val > highestRaw) {
      highestRaw = val;
      recommended = key;
    }
  }

  // Build explanation
  const dietNames = {
    normal: 'Dieta Equilibrada',
    keto: 'Dieta Cetogenica (Keto)',
    carnivore: 'Dieta Carnivora',
    if: 'Jejum Intermitente'
  };

  const topFactors = factors.slice(0, 4);
  let explanation = `Com base nas suas respostas, a ${dietNames[recommended]} e a mais indicada para voce. `;

  if (topFactors.length > 0) {
    explanation += `Principais fatores: ${topFactors.join('; ')}. `;
  }

  explanation += `Pontuacao final: ${dietNames[recommended]} (${normalized[recommended]}%).`;

  return {
    recommended,
    scores: normalized,
    explanation
  };
}
