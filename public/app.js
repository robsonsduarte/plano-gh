/* ============================================================
   Plano Dieta — PWA Frontend
   ============================================================ */

// --- STATE ---
let state = {
  token: localStorage.getItem('token') || null,
  user: null,
  currentWeek: 1,
  currentDay: new Date().getDay() || 7, // 1=Mon..7=Sun
  openMeal: -1,
  mealPlan: null,
  marketData: null,
  marketChecks: {},
  trackingEntries: [],
  onboardingStep: 1,
  quizStep: 1,
  quizAnswers: {},
  // Meal logging
  mealLogs: {},          // { mealIndex: { loggedItems, macros } }
  loggedIndexes: [],     // which meals have been logged today
  editingMeal: null,     // index of meal being edited
  editingItems: [],      // items being edited [{foodId, name, serving, prep, kcal, prot, carb, fat}]
  dayConsumed: null,     // { kcal, prot, carb, fat }
  dayRemaining: null,    // { kcal, prot, carb, fat }
  dayPerMeal: null,      // per-remaining-meal target
  searchResults: [],     // food search results
};

// --- CONSTANTS ---
const DAY_NAMES = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const DAY_FULL = ['', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

const DIET_INFO = {
  normal:    { name: 'Normal',              color: 'var(--accent)',  icon: '🥗', desc: 'Dieta balanceada com todas as refeicoes. Flexivel e facil de seguir.', badge: 'badge-normal' },
  keto:      { name: 'Cetogenica',          color: 'var(--purple)', icon: '🥑', desc: 'Low carb, high fat. Perda de peso acelerada. Requer disciplina.', badge: 'badge-keto' },
  carnivore: { name: 'Carnivora',           color: 'var(--coral)',  icon: '🥩', desc: 'Apenas proteinas animais. Simples e radical.', badge: 'badge-carnivore' },
  if:        { name: 'Jejum Intermitente',  color: 'var(--amber)',  icon: '⏰', desc: 'Come em janela de 8h, jejua 16h. Pratico e eficaz.', badge: 'badge-if' }
};

const DIET_RULES = {
  normal: [
    '5-6 refeicoes balanceadas por dia',
    'Proteina em todas as refeicoes principais (min 25g)',
    'Metade do prato = vegetais e salada',
    'Carboidratos complexos (evitar refinados)',
    'Gorduras boas (azeite, castanhas, abacate)',
    '2-3L de agua por dia',
    'Evitar ultraprocessados e acucar refinado',
    'Sono de 7-8h por noite'
  ],
  keto: [
    'Maximo 50g de carboidratos por dia',
    '70% das calorias de gordura',
    'Proteina moderada (nao excessiva para nao sair da cetose)',
    'Alimentos permitidos: carnes, peixes, ovos, queijos, castanhas, folhas verdes',
    'Proibido: arroz, pao, massa, frutas doces, acucar, batata',
    'Suplementar eletrolitos nas primeiras 2 semanas',
    'Keto flu e normal nos dias 3-14 — paciencia e caldo de osso',
    'Sem alcool — interfere na cetose'
  ],
  carnivore: [
    'Apenas proteinas animais: carne, peixe, ovos, visceras',
    'Gordura animal e sua energia principal',
    'Zero plantas: sem vegetais, frutas, graos ou legumes',
    'Sal a gosto — importante para eletrolitos',
    'Agua, cafe preto ou cha sem aditivos',
    'Figado 1x por semana cobre vitaminas essenciais',
    'Adaptacao de 3-7 dias (intestino pode estranhar)',
    'Caimbras? Aumente sal e agua'
  ],
  if: [
    'Protocolo 16:8: coma entre 12h e 20h',
    'Jejum: apenas agua, cafe preto, cha sem acucar',
    'Sucos, leite e smoothies QUEBRAM o jejum',
    'Progressao: Sem 1 sem jejum → Sem 2 com 2 dias → Sem 3 com 3 → Sem 4 com 2',
    'Dias normais: 5-6 refeicoes completas',
    'Dias de jejum: nutrientes concentrados na janela',
    'Treino leve em jejum OK; pesado na janela alimentar',
    'Hidratacao extra nos dias de jejum (2,5L minimo)'
  ]
};

const QUIZ_QUESTIONS = [
  { id:'q1', question:'Quao confiante voce esta em seguir um plano alimentar por mais de 4 semanas?', options:[{value:1,label:'Nada confiante'},{value:2,label:'Pouco confiante'},{value:3,label:'Moderadamente'},{value:4,label:'Confiante'},{value:5,label:'Muito confiante'}] },
  { id:'q2', question:'Quando esta estressado ou triste, voce tende a comer mais?', options:[{value:'always',label:'Sempre'},{value:'often',label:'Frequentemente'},{value:'sometimes',label:'As vezes'},{value:'rarely',label:'Raramente'},{value:'never',label:'Nunca'}] },
  { id:'q3', question:'Sua rotina diaria e...', options:[{value:'predictable',label:'Muito previsivel (escritorio 9-17h)'},{value:'regular',label:'Relativamente regular'},{value:'variable',label:'Muito variavel / turnos'},{value:'flexible',label:'Flexivel (autonomo/remoto)'}] },
  { id:'q4', question:'Com que frequencia voce cozinha em casa?', options:[{value:'daily',label:'Todos os dias'},{value:'4_5',label:'4-5 vezes por semana'},{value:'2_3',label:'2-3 vezes por semana'},{value:'rarely',label:'Raramente'}] },
  { id:'q5', question:'Sobre o cafe da manha, voce...', options:[{value:'love',label:'Adoro, nao pulo nunca'},{value:'habit',label:'Como por habito, mas poderia pular'},{value:'skip',label:'Frequentemente pulo'},{value:'never',label:'Nunca tomo cafe da manha'}] },
  { id:'q6', question:'Sua relacao com carne e...', options:[{value:'love',label:'Amo carne, poderia comer so isso'},{value:'regular',label:'Gosto, como regularmente'},{value:'moderate',label:'Como moderadamente'},{value:'prefer_less',label:'Prefiro pouca carne'}] },
  { id:'q7', question:'Sobre variedade na alimentacao...', options:[{value:'need',label:'Preciso de muita variedade'},{value:'flexible',label:'Gosto mas aceito repeticao'},{value:'prefer_same',label:'Prefiro comer as mesmas coisas'}] },
  { id:'q8', question:'Voce se sente confortavel contando calorias e macros?', options:[{value:'yes',label:'Sim, gosto de ter controle'},{value:'can_do',label:'Consigo fazer se necessario'},{value:'no',label:'Nao, prefiro simplicidade'}] },
  { id:'q9', question:'Sua familia ou parceiro(a) apoia mudancas na dieta?', options:[{value:'yes',label:'Sim, totalmente'},{value:'partial',label:'Parcialmente'},{value:'no',label:'Nao / como sozinho(a)'}] },
  { id:'q10', question:'Qual seu objetivo principal?', options:[{value:'lose_fast',label:'Perder peso rapidamente'},{value:'lose_gradual',label:'Perder peso gradualmente'},{value:'gain_muscle',label:'Ganhar massa muscular'},{value:'energy',label:'Mais energia e disposicao'},{value:'digestive',label:'Resolver problemas digestivos'}] }
];

const FOOD_PREFERENCES = {
  'Proteinas': ['eggs','chicken','beef','salmon','tuna','tilapia','sardine','turkey','whey','greek_yogurt','cottage'],
  'Legumes e Verduras': ['broccoli','spinach','kale','beet','carrot','zucchini','bell_pepper','tomato','mushroom'],
  'Frutas': ['banana','apple','strawberry','blueberry','orange','avocado','acai','cherry'],
  'Carboidratos': ['brown_rice','oats','quinoa','sweet_potato','lentils','chickpeas','black_beans','whole_bread'],
  'Gorduras Boas': ['olive_oil','peanuts','mixed_nuts','peanut_butter','pumpkin_seeds','chia_seeds']
};

const FOOD_NAMES = {
  eggs:'Ovos', chicken:'Frango', beef:'Carne bovina', salmon:'Salmao',
  tuna:'Atum', tilapia:'Tilapia', sardine:'Sardinha', turkey:'Peru',
  whey:'Whey protein', greek_yogurt:'Iogurte grego', cottage:'Queijo cottage',
  broccoli:'Brocolis', spinach:'Espinafre', kale:'Couve', beet:'Beterraba',
  carrot:'Cenoura', zucchini:'Abobrinha', bell_pepper:'Pimentao',
  tomato:'Tomate', mushroom:'Cogumelo',
  banana:'Banana', apple:'Maca', strawberry:'Morango', blueberry:'Mirtilos',
  orange:'Laranja', avocado:'Abacate', acai:'Acai', cherry:'Cereja',
  brown_rice:'Arroz integral', oats:'Aveia', quinoa:'Quinoa',
  sweet_potato:'Batata-doce', lentils:'Lentilha', chickpeas:'Grao-de-bico',
  black_beans:'Feijao', whole_bread:'Pao integral',
  olive_oil:'Azeite', peanuts:'Amendoim', mixed_nuts:'Castanhas',
  peanut_butter:'Pasta de amendoim', pumpkin_seeds:'Sem. abobora', chia_seeds:'Chia'
};

const TIPS = [
  'Beba um copo de agua antes de cada refeicao — ajuda na saciedade.',
  'Mastigue devagar! Leva 20 min pro cerebro registrar saciedade.',
  'Prepare as marmitas do dia seguinte a noite — evita decisoes ruins.',
  'Durma bem: sono ruim aumenta grelina (hormonio da fome).',
  'Frutas vermelhas sao as mais low-carb entre as frutas.',
  'Cafe preto sem acucar tem zero calorias e acelera o metabolismo.',
  'Nao pule refeicoes — isso leva a compulsao na proxima.',
  'Azeite extra virgem e a gordura mais saudavel para cozinhar.',
  'Evite comer distraido (celular, TV) — isso aumenta o consumo.',
  'Uma caminhada de 15min apos o almoco melhora a digestao.'
];

// --- HELPERS ---
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

// --- THEME ---
function getTheme() { return localStorage.getItem('theme') || 'dark'; }
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#F5F3F0' : '#111318';
  // Update toggle in config if visible
  document.querySelectorAll('.toggle-switch#cfg-theme-toggle').forEach(t => t.classList.toggle('on', theme === 'light'));
}
function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }
// Apply saved theme immediately
setTheme(getTheme());
// Header theme button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-btn');
  if (btn) btn.addEventListener('click', toggleTheme);
});

async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`/api${path}`, opts);
    if (res.status === 401) { logout(); return null; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      return { _error: true, ...err };
    }
    return res.json();
  } catch (e) {
    console.error('API error:', e);
    return { _error: true, error: 'Sem conexao com o servidor' };
  }
}

function calcIMC(weight, heightCm) {
  const h = heightCm / 100;
  return weight / (h * h);
}

function calcTMB(sex, weight, heightCm, age) {
  if (sex === 'F') return 447.593 + (9.247 * weight) + (3.098 * heightCm) - (4.330 * age);
  return 88.362 + (13.397 * weight) + (4.799 * heightCm) - (5.677 * age);
}

function activityMultiplier(level) {
  const m = { sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725, extreme: 1.9 };
  return m[level] || 1.55;
}

function idealWeight(sex, heightCm) {
  if (sex === 'F') return 62 + 0.516 * (heightCm - 152.4);
  return 52 + 0.75 * (heightCm - 152.4);
}

function mealBarClass(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('cafe') || n.includes('desjejum')) return 'cafe';
  if (n.includes('almoco') || n.includes('almoço')) return 'almoco';
  if (n.includes('lanche')) return 'lanche';
  if (n.includes('jantar') || n.includes('janta')) return 'jantar';
  if (n.includes('ceia') || n.includes('snack')) return 'snack';
  return 'default';
}

function todayTip() {
  const idx = Math.floor(Date.now() / 86400000) % TIPS.length;
  return TIPS[idx];
}

// --- AUTH ---
function showAuth() {
  $('#auth-screen').style.display = '';
  $('#onboarding').style.display = 'none';
  $('#app').style.display = 'none';
  $('#bottomNav').style.display = 'none';
}

function handleLogin(e) {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;
  $('#login-error').textContent = '';

  api('POST', '/auth/login', { email, password }).then(data => {
    if (!data || data._error) {
      $('#login-error').textContent = data?.error || 'Email ou senha invalidos';
      return;
    }
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    afterAuth();
  });
}

function handleRegister(e) {
  e.preventDefault();
  const name = $('#reg-name').value.trim();
  const email = $('#reg-email').value.trim();
  const password = $('#reg-password').value;
  $('#register-error').textContent = '';

  if (password.length < 6) {
    $('#register-error').textContent = 'Senha deve ter no minimo 6 caracteres';
    return;
  }

  api('POST', '/auth/register', { name, email, password }).then(data => {
    if (!data || data._error) {
      $('#register-error').textContent = data?.error || 'Erro ao criar conta';
      return;
    }
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    // Pre-fill onboarding name
    $('#ob-name').value = name;
    showOnboarding();
  });
}

function logout() {
  state.token = null;
  state.user = null;
  state.mealPlan = null;
  state.marketData = null;
  state.trackingEntries = [];
  localStorage.removeItem('token');
  showAuth();
}

async function afterAuth() {
  if (!state.user) {
    const data = await api('GET', '/users/me');
    if (!data || data._error) return;
    state.user = data.user || data;
  }
  const u = state.user;
  if (!u.diet_type || !u.quiz_result?.recommended) {
    showOnboarding();
  } else {
    showApp();
  }
}

// --- ONBOARDING ---
function showOnboarding() {
  $('#auth-screen').style.display = 'none';
  $('#onboarding').style.display = '';
  $('#app').style.display = 'none';
  $('#bottomNav').style.display = 'none';
  state.onboardingStep = 1;
  state.quizStep = 1;
  state.quizAnswers = {};

  // Pre-fill if user data exists
  if (state.user?.name) $('#ob-name').value = state.user.name;
  if (state.user?.age) $('#ob-age').value = state.user.age;
  if (state.user?.height) $('#ob-height').value = state.user.height;
  if (state.user?.weight) $('#ob-weight').value = state.user.weight;

  buildFoodPrefGrid();
  updateOnboardingUI();
}

function updateOnboardingUI() {
  const step = state.onboardingStep;
  $$('.ob-step').forEach((el, i) => el.classList.toggle('active', i + 1 === step));
  $('#ob-progress-bar').style.width = `${step * 25}%`;
  $('#ob-step-label').textContent = `Passo ${step} de 4`;
  $('#ob-back-btn').style.visibility = step > 1 ? 'visible' : 'hidden';

  if (step === 3) renderQuizQuestion();
  if (step === 4) renderQuizResult();
}

function nextOnboardingStep() {
  const step = state.onboardingStep;

  if (step === 1) {
    const name = $('#ob-name').value.trim();
    const age = parseInt($('#ob-age').value);
    const height = parseInt($('#ob-height').value);
    const weight = parseFloat($('#ob-weight').value);
    const errEl = $('#ob-step1-error');
    errEl.textContent = '';

    if (!name) { errEl.textContent = 'Informe seu nome'; return; }
    if (!age || age < 14 || age > 99) { errEl.textContent = 'Idade invalida'; return; }
    if (!height || height < 100 || height > 250) { errEl.textContent = 'Altura invalida'; return; }
    if (!weight || weight < 30 || weight > 300) { errEl.textContent = 'Peso invalido'; return; }
  }

  if (step < 4) {
    state.onboardingStep++;
    updateOnboardingUI();
  }
}

function prevOnboardingStep() {
  if (state.onboardingStep > 1) {
    state.onboardingStep--;
    updateOnboardingUI();
  }
}

function buildFoodPrefGrid() {
  const container = $('#food-pref-grid');
  container.innerHTML = '';
  for (const [category, foods] of Object.entries(FOOD_PREFERENCES)) {
    const div = document.createElement('div');
    div.className = 'food-category';
    div.innerHTML = `<h3>${category}</h3><div class="food-grid">${
      foods.map(f => `<label class="food-item"><input type="checkbox" value="${f}" checked><span>${FOOD_NAMES[f] || f}</span></label>`).join('')
    }</div>`;
    container.appendChild(div);
  }
  // Build restrictions grid (same foods, unchecked, for selecting what NOT to eat)
  const rContainer = $('#food-restrict-grid');
  if (rContainer) {
    const allFoods = Object.values(FOOD_PREFERENCES).flat();
    rContainer.innerHTML = `<div class="food-grid">${
      allFoods.map(f => `<label class="food-item restrict"><input type="checkbox" value="${f}"><span>${FOOD_NAMES[f] || f}</span></label>`).join('')
    }</div>`;
  }
}

// --- QUIZ ---
function renderQuizQuestion() {
  const q = QUIZ_QUESTIONS[state.quizStep - 1];
  const selected = state.quizAnswers[q.id];
  $('#quiz-progress').textContent = `Pergunta ${state.quizStep} de ${QUIZ_QUESTIONS.length}`;
  $('#quiz-prev').style.visibility = state.quizStep > 1 ? 'visible' : 'hidden';
  $('#quiz-next').textContent = state.quizStep === QUIZ_QUESTIONS.length ? 'Ver resultado' : 'Proxima';

  const container = $('#quiz-container');
  container.innerHTML = `<div class="quiz-question">${q.question}</div>` +
    q.options.map(o => `<button class="quiz-option${selected !== undefined && String(selected) === String(o.value) ? ' selected' : ''}" data-qid="${q.id}" data-val="${o.value}">${o.label}</button>`).join('');

  container.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      state.quizAnswers[q.id] = btn.dataset.val;
      container.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

function quizNext() {
  const q = QUIZ_QUESTIONS[state.quizStep - 1];
  if (state.quizAnswers[q.id] === undefined) return; // must answer

  if (state.quizStep < QUIZ_QUESTIONS.length) {
    state.quizStep++;
    renderQuizQuestion();
  } else {
    // Move to result step
    state.onboardingStep = 4;
    updateOnboardingUI();
  }
}

function quizPrev() {
  if (state.quizStep > 1) {
    state.quizStep--;
    renderQuizQuestion();
  }
}

function computeQuizResult() {
  const a = state.quizAnswers;
  let scores = { normal: 50, keto: 30, carnivore: 20, if: 30 };

  // q1 confidence
  const conf = parseInt(a.q1) || 3;
  if (conf >= 4) { scores.keto += 10; scores.carnivore += 10; scores.if += 8; }
  if (conf <= 2) { scores.normal += 15; }

  // q2 emotional eating
  if (a.q2 === 'always' || a.q2 === 'often') { scores.normal += 10; scores.if -= 5; }
  if (a.q2 === 'rarely' || a.q2 === 'never') { scores.if += 10; scores.keto += 5; }

  // q3 routine
  if (a.q3 === 'predictable' || a.q3 === 'regular') { scores.if += 12; }
  if (a.q3 === 'variable') { scores.normal += 10; scores.if -= 8; }

  // q4 cooking
  if (a.q4 === 'daily' || a.q4 === '4_5') { scores.keto += 8; scores.carnivore += 10; }
  if (a.q4 === 'rarely') { scores.normal += 10; }

  // q5 breakfast
  if (a.q5 === 'skip' || a.q5 === 'never') { scores.if += 15; }
  if (a.q5 === 'love') { scores.normal += 10; scores.if -= 10; }

  // q6 meat relation
  if (a.q6 === 'love') { scores.carnivore += 20; scores.keto += 5; }
  if (a.q6 === 'prefer_less') { scores.carnivore -= 15; scores.normal += 10; }

  // q7 variety
  if (a.q7 === 'need') { scores.normal += 10; scores.carnivore -= 10; }
  if (a.q7 === 'prefer_same') { scores.carnivore += 10; scores.keto += 5; }

  // q8 counting
  if (a.q8 === 'yes') { scores.keto += 8; }
  if (a.q8 === 'no') { scores.normal += 8; scores.carnivore += 5; }

  // q9 family support
  if (a.q9 === 'no') { scores.carnivore -= 15; scores.keto -= 10; }
  if (a.q9 === 'yes') { scores.keto += 5; scores.carnivore += 5; }

  // q10 goal
  if (a.q10 === 'lose_fast') { scores.keto += 12; scores.if += 8; }
  if (a.q10 === 'lose_gradual') { scores.normal += 10; }
  if (a.q10 === 'gain_muscle') { scores.normal += 8; scores.carnivore += 8; }
  if (a.q10 === 'energy') { scores.if += 8; }
  if (a.q10 === 'digestive') { scores.carnivore += 10; }

  // Normalize
  const max = Math.max(...Object.values(scores));
  const recommended = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const pct = Math.round((scores[recommended] / max) * 100);

  return { recommended, scores, percentage: pct };
}

function renderQuizResult() {
  const result = computeQuizResult();
  const diet = DIET_INFO[result.recommended];

  $('#quiz-result').innerHTML = `
    <div class="result-card">
      <div class="result-icon">${diet.icon}</div>
      <div class="result-diet">${diet.name}</div>
      <div class="result-score">${result.percentage}% compativel com seu perfil</div>
      <p class="result-desc">${diet.desc}</p>
    </div>
    <button class="btn btn-primary btn-full" id="accept-diet" data-diet="${result.recommended}">Aceitar recomendacao</button>
    <button class="btn btn-secondary btn-full" style="margin-top:8px" id="choose-other">Escolher outra dieta</button>
  `;

  $('#accept-diet').addEventListener('click', () => finishOnboarding(result.recommended, result));
  $('#choose-other').addEventListener('click', () => {
    $('#diet-picker').style.display = '';
    renderDietPicker(result);
  });
}

function renderDietPicker(result) {
  const container = $('#diet-options');
  container.innerHTML = Object.entries(DIET_INFO).map(([key, d]) =>
    `<div class="diet-card" data-diet="${key}">
      <h4>${d.icon} ${d.name}</h4>
      <p>${d.desc}</p>
    </div>`
  ).join('');

  container.querySelectorAll('.diet-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.diet-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      finishOnboarding(card.dataset.diet, result);
    });
  });
}

async function finishOnboarding(dietType, quizResult) {
  const sex = document.querySelector('input[name="ob-sex"]:checked')?.value || 'M';
  const profileData = {
    name: $('#ob-name').value.trim(),
    sex,
    age: parseInt($('#ob-age').value),
    height: parseInt($('#ob-height').value),
    weight: parseFloat($('#ob-weight').value),
    activity_level: $('#ob-activity').value
  };

  // Gather food preferences
  const favorites = [];
  $$('#food-pref-grid input[type="checkbox"]:checked').forEach(cb => favorites.push(cb.value));
  const restrictions = [];
  $$('#food-restrict-grid input[type="checkbox"]:checked').forEach(cb => restrictions.push(cb.value));
  const extraRestrictions = $('#ob-restrictions-extra')?.value.trim().split(',').map(s => s.trim()).filter(Boolean) || [];
  restrictions.push(...extraRestrictions);

  // Save all data
  const [profileRes] = await Promise.all([
    api('PUT', '/users/me', profileData),
    api('PUT', '/users/me/preferences', { favorites, restrictions }),
    api('PUT', '/users/me/diet', { diet_type: dietType }),
    api('PUT', '/users/me/quiz', { answers: state.quizAnswers, result: quizResult })
  ]);

  if (profileRes && !profileRes._error) {
    state.user = profileRes.user || profileRes;
    // Ensure diet_type and quiz_result are set
    state.user.diet_type = dietType;
    state.user.quiz_result = quizResult;
    showApp();
  }
}

// --- MAIN APP ---
function showApp() {
  $('#auth-screen').style.display = 'none';
  $('#onboarding').style.display = 'none';
  $('#app').style.display = '';
  $('#bottomNav').style.display = '';

  buildWeekTabs();
  buildDayStrip();
  showPage('cardapio');
}

function buildWeekTabs() {
  const container = $('#weekTabs');
  container.innerHTML = '';
  for (let w = 1; w <= 4; w++) {
    const btn = document.createElement('button');
    btn.className = `wtab${w === state.currentWeek ? ' active' : ''}`;
    btn.textContent = `Sem ${w}`;
    btn.addEventListener('click', () => {
      state.currentWeek = w;
      container.querySelectorAll('.wtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mealPlan = null;
      state.marketData = null;
      loadAndRenderCurrentPage();
    });
    container.appendChild(btn);
  }
}

function buildDayStrip() {
  const container = $('#dayStrip');
  container.innerHTML = '';
  for (let d = 1; d <= 7; d++) {
    const btn = document.createElement('button');
    btn.className = `dpill${d === state.currentDay ? ' active' : ''}`;
    let label = DAY_NAMES[d];
    // For IF diet, mark fasting days
    if (state.user?.diet_type === 'if') {
      const fastingDays = getFastingDays(state.currentWeek);
      if (fastingDays.includes(d)) label += ' <span class="fasting-dot">⚡</span>';
    }
    btn.innerHTML = label;
    btn.addEventListener('click', () => {
      state.currentDay = d;
      container.querySelectorAll('.dpill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.openMeal = -1;
      renderCardapio();
    });
    container.appendChild(btn);
  }
}

function getFastingDays(week) {
  // Match backend IF_FASTING_DAYS: week1 none, week2 Wed/Fri, week3 Mon/Wed/Fri, week4 Wed/Fri
  if (state.mealPlan && state.mealPlan.length) {
    return state.mealPlan.filter(d => d.fasting).map(d => d.dayNum);
  }
  const map = { 1: [], 2: [3, 5], 3: [1, 3, 5], 4: [3, 5] };
  return map[week] || [];
}

// --- NAVIGATION ---
function showPage(name) {
  $$('.page').forEach(p => p.classList.remove('active'));
  const page = $(`#page-${name}`);
  if (page) page.classList.add('active');

  $$('.nbtn').forEach(b => b.classList.toggle('active', b.dataset.page === name));

  // Show/hide header elements
  const showHeader = name === 'cardapio';
  $('#weekTabs').style.display = showHeader ? '' : 'none';
  $('#dayStrip').style.display = showHeader ? '' : 'none';

  loadAndRenderCurrentPage(name);
}

async function loadAndRenderCurrentPage(name) {
  const page = name || getCurrentPage();
  switch (page) {
    case 'cardapio':
      if (!state.mealPlan) await loadMealPlan(state.currentWeek);
      await loadMealLogs();
      renderCardapio();
      break;
    case 'perfil':
      renderPerfil();
      break;
    case 'tracking':
      await loadTracking();
      renderTracking();
      break;
    case 'regras':
      renderRegras();
      break;
    case 'mercado':
      await loadMarket(state.currentWeek);
      renderMercado();
      break;
    case 'config':
      renderConfig();
      break;
  }
}

function getCurrentPage() {
  const active = $('.nbtn.active');
  return active ? active.dataset.page : 'cardapio';
}

// --- CARDAPIO ---
async function loadMealPlan(weekNum) {
  const data = await api('GET', `/meals/${weekNum}`);
  if (data && !data._error) {
    state.mealPlan = data;
  }
}

function renderCardapio() {
  const page = $('#page-cardapio');
  const u = state.user || {};
  const plan = state.mealPlan;
  const diet = u.diet_type || 'normal';
  const di = DIET_INFO[diet] || DIET_INFO.normal;

  // Get today's data — backend returns { days: [{dayNum, dayName, fasting, macros:{kcal,prot,carb,fat}, meals:[{type,time,name,items:"string",gh}], tip}] }
  const days = plan?.days || (Array.isArray(plan) ? plan : []);
  const dayData = days[state.currentDay - 1] || null;
  const isFasting = dayData?.fasting || (diet === 'if' && getFastingDays(state.currentWeek).includes(state.currentDay));

  // Hero — macros from backend
  const macros = dayData?.macros || {};
  const kcal = macros.kcal || 1950;
  const prot = macros.prot || '—';
  const carb = macros.carb || '—';
  const fat = macros.fat || '—';

  $('#kcalBadge').textContent = `~${kcal} kcal`;

  let html = `
    <div class="hero">
      <div class="hero-top">
        <span class="hero-name">Ola, ${esc(u.name || 'Usuario')}</span>
        <span class="diet-badge ${di.badge}">${di.icon} ${di.name}</span>
      </div>
      <div class="macros">
        <div class="macro"><div class="macro-val">${kcal}</div><div class="macro-label">kcal</div></div>
        <div class="macro"><div class="macro-val">${prot}g</div><div class="macro-label">prot</div></div>
        <div class="macro"><div class="macro-val">${carb}g</div><div class="macro-label">carb</div></div>
        <div class="macro"><div class="macro-val">${fat}g</div><div class="macro-label">gord</div></div>
      </div>
      <div style="font-size:.65rem;color:var(--ts);text-align:center;margin-top:6px">Meta diaria · ajuste porcoes conforme necessidade</div>
    </div>
  `;

  // Consumed vs remaining summary (if any meals logged)
  if (state.dayConsumed && state.dayConsumed.kcal > 0) {
    const c = state.dayConsumed;
    const r = state.dayRemaining || { kcal: kcal - c.kcal, prot: prot - c.prot, carb: carb - c.carb, fat: fat - c.fat };
    html += `<div class="macro-consumed">
      <div><span style="color:var(--accent)">${c.kcal}</span><br>consumido</div>
      <div><span style="color:var(--amber)">${Math.max(0, r.kcal)}</span><br>restante</div>
      <div><span style="color:var(--text-muted)">${kcal}</span><br>meta</div>
    </div>`;
  }

  // Fasting badge
  if (isFasting) {
    html += `<div class="fasting-badge">⚡ Dia de jejum intermitente — janela alimentar: 12h as 20h</div>`;
  }

  // Meals
  const meals = dayData?.meals || [];
  if (meals.length === 0) {
    html += `<p style="color:var(--ts);text-align:center;padding:40px 0">Cardapio nao disponivel para este dia.</p>`;
  } else {
    meals.forEach((meal, i) => {
      const barCls = mealBarClass(meal.name || meal.type);
      const isOpen = state.openMeal === i;
      const isEditing = state.editingMeal === i;
      const isLogged = state.loggedIndexes.includes(i);
      const log = state.mealLogs[i];

      const itemsStr = typeof meal.items === 'string' ? meal.items : '';
      const itemsList = itemsStr.split(' · ').filter(Boolean);
      const preview = isLogged && log ? log.loggedItems.map(it => it.name).join(', ') : (itemsList[0] || '');

      html += `
        <div class="meal-card${isOpen ? ' open' : ''}${isLogged ? ' meal-logged' : ''}" data-meal="${i}">
          <div class="meal-head" onclick="toggleMeal(${i})">
            <div class="meal-bar ${barCls}"></div>
            <div class="meal-info">
              <div class="meal-title">${esc(meal.name || meal.type)}${isLogged ? ' <span style="color:var(--accent)">✓</span>' : ''}</div>
              <div class="meal-meta">
                ${meal.time ? `<span>${meal.time}</span>` : ''}
                ${isLogged && log ? `<span style="color:var(--accent)">${log.macros.kcal} kcal</span>` : ''}
                ${meal.gh ? '<span class="gh-tag">↑ GH</span>' : ''}
              </div>
            </div>
            <span class="meal-arrow">▼</span>
          </div>
          ${!isOpen ? `<div class="meal-preview">${esc(preview)}...</div>` : ''}`;

      // OPEN STATE — 3 modes
      if (isOpen && isEditing) {
        // EDIT MODE
        html += `<div class="meal-body meal-edit-body">`;
        state.editingItems.forEach((item, idx) => {
          html += `<div class="meal-item-edit">
            <span class="mei-text">· ${esc(item.name)}${item.serving ? ` (${esc(item.serving)})` : ''}${item.prep ? ` — ${esc(item.prep)}` : ''}</span>
            <span class="mei-macros">${item.kcal}kcal</span>
            <button class="mei-delete" onclick="removeEditItem(${idx})">✕</button>
          </div>`;
        });
        const editTotal = state.editingItems.reduce((s, it) => s + (it.kcal || 0), 0);
        html += `<div style="font-size:.75rem;color:var(--text-muted);padding:6px 0;text-align:right">Total: ${editTotal} kcal</div>`;
        html += `<div class="meal-add-row">
          <input type="text" class="meal-search" id="meal-search-input" placeholder="Buscar alimento para adicionar..." oninput="searchFoodForMeal(this.value)">
          <div class="meal-search-results" id="meal-search-results"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-full" onclick="confirmMeal(${i})">Confirmar refeicao</button>
          <button class="btn btn-secondary" onclick="cancelEditMode()">Cancelar</button>
        </div>
        </div>`;
      } else if (isOpen && isLogged && log) {
        // LOGGED MODE — show what was actually eaten
        html += `<div class="meal-body">`;
        log.loggedItems.forEach(item => {
          html += `<div class="meal-item">· ${esc(item.name)}${item.serving ? ` (${esc(item.serving)})` : ''}${item.prep ? ` — ${esc(item.prep)}` : ''}</div>`;
        });
        html += `<div style="font-size:.75rem;color:var(--accent);padding:6px 0">Consumido: ${log.macros.kcal} kcal · ${log.macros.prot}g prot · ${log.macros.carb}g carb · ${log.macros.fat}g gord</div>`;
        html += `<button class="btn btn-secondary btn-full" style="margin-top:4px" onclick="enterEditMode(${i})">Re-editar</button>`;
        html += `</div>`;
      } else if (isOpen) {
        // NORMAL MODE — show suggested items + edit button
        html += `<div class="meal-body">`;
        itemsList.forEach(item => {
          html += `<div class="meal-item">· ${esc(item)}</div>`;
        });
        // Show per-meal target if adjusted
        if (state.dayPerMeal && !isLogged) {
          html += `<div class="meal-adjusted-note">Meta ajustada: ~${state.dayPerMeal.kcal} kcal para esta refeicao</div>`;
        }
        html += `<button class="btn btn-primary btn-full" style="margin-top:8px" onclick="enterEditMode(${i})">Registrar o que comi</button>`;
        html += `</div>`;
      }

      html += `</div>`;
    });
  }

  // Tip — use backend tip if available, fallback to local
  const tip = dayData?.tip || todayTip();
  html += `
    <div class="tip-card">
      <div class="tip-label">Dica do dia</div>
      <p>${esc(tip)}</p>
    </div>
  `;

  page.innerHTML = html;
}

function toggleMeal(i) {
  if (state.editingMeal === i) return; // don't collapse while editing
  state.openMeal = state.openMeal === i ? -1 : i;
  renderCardapio();
}

// --- MEAL LOGGING ---
function enterEditMode(mealIndex) {
  const days = state.mealPlan?.days || [];
  const dayData = days[state.currentDay - 1];
  const meal = dayData?.meals?.[mealIndex];
  if (!meal) return;

  // Parse itemDetails or fallback to parsing the items string
  if (meal.itemDetails && meal.itemDetails.length) {
    state.editingItems = meal.itemDetails.map(d => ({ ...d }));
  } else {
    const parts = (meal.items || '').split(' · ').filter(Boolean);
    state.editingItems = parts.map(p => ({ foodId: null, name: p, serving: '', prep: '', kcal: 0, prot: 0, carb: 0, fat: 0 }));
  }

  // If this meal was previously logged, load those items instead
  if (state.mealLogs[mealIndex]) {
    state.editingItems = state.mealLogs[mealIndex].loggedItems.map(d => ({ ...d }));
  }

  state.editingMeal = mealIndex;
  state.openMeal = mealIndex;
  state.searchResults = [];
  renderCardapio();
}

function cancelEditMode() {
  state.editingMeal = null;
  state.editingItems = [];
  state.searchResults = [];
  renderCardapio();
}

function removeEditItem(idx) {
  state.editingItems.splice(idx, 1);
  renderCardapio();
}

async function searchFoodForMeal(query) {
  if (!query || query.length < 2) { state.searchResults = []; renderCardapio(); return; }
  const results = await api('GET', `/meals/foods/search?q=${encodeURIComponent(query)}`);
  state.searchResults = results || [];
  renderSearchResults();
}

function renderSearchResults() {
  const container = document.getElementById('meal-search-results');
  if (!container) return;
  container.innerHTML = state.searchResults.map((f, i) =>
    `<div class="meal-search-item" onclick="addSearchedFood(${i})">${esc(f.name)} <span style="color:var(--text-muted);font-size:.75rem">(${f.serving} · ${f.kcal}kcal)</span></div>`
  ).join('') || (state.searchResults.length === 0 ? '<div class="meal-search-item" style="color:var(--text-muted)">Nenhum resultado</div>' : '');
}

function addSearchedFood(searchIdx) {
  const food = state.searchResults[searchIdx];
  if (!food) return;
  state.editingItems.push({
    foodId: food.foodId, name: food.name, serving: food.serving,
    prep: food.preps?.[0] || '', kcal: food.kcal, prot: food.prot, carb: food.carb, fat: food.fat
  });
  state.searchResults = [];
  renderCardapio();
}

async function confirmMeal(mealIndex) {
  const days = state.mealPlan?.days || [];
  const dayData = days[state.currentDay - 1];
  const meal = dayData?.meals?.[mealIndex];

  const today = new Date().toISOString().split('T')[0];
  const body = {
    date: today,
    weekNum: state.currentWeek,
    dayNum: state.currentDay,
    mealIndex,
    mealType: meal?.type || '',
    originalItems: meal?.items || '',
    loggedItems: state.editingItems
  };

  const res = await api('POST', '/meals/log', body);
  if (res && !res.error) {
    state.mealLogs[mealIndex] = { loggedItems: [...state.editingItems], macros: res.logged?.macros };
    state.loggedIndexes = res.loggedIndexes || [];
    state.dayConsumed = res.consumed;
    state.dayRemaining = res.remaining;
    state.dayPerMeal = res.perMeal;
    state.editingMeal = null;
    state.editingItems = [];
    state.searchResults = [];
    renderCardapio();
  }
}

async function loadMealLogs() {
  const today = new Date().toISOString().split('T')[0];
  const data = await api('GET', `/meals/logs/${today}`);
  if (data && data.logs) {
    state.mealLogs = {};
    for (const log of data.logs) {
      state.mealLogs[log.meal_index] = {
        loggedItems: typeof log.logged_items === 'string' ? JSON.parse(log.logged_items) : log.logged_items,
        macros: { kcal: Number(log.total_kcal), prot: Number(log.total_prot), carb: Number(log.total_carb), fat: Number(log.total_fat) }
      };
    }
    state.loggedIndexes = data.loggedIndexes || [];
    state.dayConsumed = data.consumed;
  }
}

// --- PERFIL ---
function renderPerfil() {
  const page = $('#page-perfil');
  const u = state.user || {};
  const diet = u.diet_type || 'normal';
  const di = DIET_INFO[diet] || DIET_INFO.normal;

  const imc = u.weight && u.height ? calcIMC(u.weight, u.height).toFixed(1) : '—';
  const tmb = u.weight && u.height && u.age ? Math.round(calcTMB(u.sex || 'M', u.weight, u.height, u.age)) : '—';
  const tdee = tmb !== '—' ? Math.round(tmb * activityMultiplier(u.activity_level)) : '—';
  const meta = tdee !== '—' ? Math.round(tdee * 0.85) : '—'; // 15% deficit
  const pesoIdeal = u.height ? idealWeight(u.sex || 'M', u.height).toFixed(1) : '—';

  const weekProgress = Math.min(state.currentWeek / 4 * 100, 100);
  const dayProgress = Math.min(state.currentDay / 7 * 100, 100);

  let html = `
    <h2 class="section-title">Seu Perfil</h2>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Nome</span><span class="info-val">${esc(u.name || '—')}</span></div>
      <div class="info-row"><span class="info-label">Sexo</span><span class="info-val">${u.sex === 'F' ? 'Feminino' : 'Masculino'}</span></div>
      <div class="info-row"><span class="info-label">Idade</span><span class="info-val">${u.age || '—'} anos</span></div>
      <div class="info-row"><span class="info-label">Altura</span><span class="info-val">${u.height || '—'} cm</span></div>
      <div class="info-row"><span class="info-label">Peso</span><span class="info-val">${u.weight || '—'} kg</span></div>
      <div class="info-row"><span class="info-label">IMC</span><span class="info-val">${imc}</span></div>
      <div class="info-row"><span class="info-label">Peso ideal</span><span class="info-val">${pesoIdeal} kg</span></div>
      <div class="info-row"><span class="info-label">TMB</span><span class="info-val">${tmb} kcal</span></div>
      <div class="info-row"><span class="info-label">Meta calorica</span><span class="info-val">${meta} kcal</span></div>
      <div class="info-row"><span class="info-label">Dieta</span><span class="info-val"><span class="diet-badge ${di.badge}">${di.icon} ${di.name}</span></span></div>
    </div>

    <div class="progress-section">
      <div class="progress-label"><span>Semana ${state.currentWeek} de 4</span><span>${Math.round(weekProgress)}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${weekProgress}%"></div></div>
    </div>
    <div class="progress-section">
      <div class="progress-label"><span>Dia ${state.currentDay} de 7</span><span>${Math.round(dayProgress)}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${dayProgress}%"></div></div>
    </div>
  `;

  // Nutrient grid for normal/if diets
  if (diet === 'normal' || diet === 'if') {
    html += `
      <h3 class="section-title">GH — Nutrientes Bonus</h3>
      <div class="nutrient-grid">
        <div class="nutrient-card"><div class="nutrient-val">B12</div><div class="nutrient-label">Vitamina</div></div>
        <div class="nutrient-card"><div class="nutrient-val">D3</div><div class="nutrient-label">Vitamina</div></div>
        <div class="nutrient-card"><div class="nutrient-val">Mg</div><div class="nutrient-label">Magnesio</div></div>
        <div class="nutrient-card"><div class="nutrient-val">Zn</div><div class="nutrient-label">Zinco</div></div>
        <div class="nutrient-card"><div class="nutrient-val">Fe</div><div class="nutrient-label">Ferro</div></div>
        <div class="nutrient-card"><div class="nutrient-val">Ca</div><div class="nutrient-label">Calcio</div></div>
      </div>
    `;
  }

  html += `<button class="btn btn-secondary btn-full" id="edit-profile-btn">Editar perfil</button>`;
  html += `<div id="edit-profile-form" style="display:none"></div>`;

  page.innerHTML = html;

  $('#edit-profile-btn').addEventListener('click', showEditProfileForm);
}

function showEditProfileForm() {
  const u = state.user || {};
  const form = $('#edit-profile-form');
  form.style.display = '';
  form.innerHTML = `
    <div class="edit-overlay">
      <h3>Editar Perfil</h3>
      <div class="field"><label>Nome</label><input type="text" id="ep-name" value="${u.name || ''}"></div>
      <div class="field">
        <label>Sexo</label>
        <div class="radio-row">
          <label class="radio-card"><input type="radio" name="ep-sex" value="M" ${u.sex !== 'F' ? 'checked' : ''}><span>Masculino</span></label>
          <label class="radio-card"><input type="radio" name="ep-sex" value="F" ${u.sex === 'F' ? 'checked' : ''}><span>Feminino</span></label>
        </div>
      </div>
      <div class="field"><label>Idade</label><input type="number" id="ep-age" value="${u.age || ''}"></div>
      <div class="field"><label>Altura (cm)</label><input type="number" id="ep-height" value="${u.height || ''}"></div>
      <div class="field"><label>Peso (kg)</label><input type="number" id="ep-weight" value="${u.weight || ''}" step="0.1"></div>
      <div class="field">
        <label>Nivel de atividade</label>
        <select id="ep-activity">
          <option value="sedentary" ${u.activity_level === 'sedentary' ? 'selected' : ''}>Sedentario</option>
          <option value="light" ${u.activity_level === 'light' ? 'selected' : ''}>Leve</option>
          <option value="moderate" ${u.activity_level === 'moderate' ? 'selected' : ''}>Moderado</option>
          <option value="very_active" ${u.activity_level === 'very_active' ? 'selected' : ''}>Ativo</option>
          <option value="extreme" ${u.activity_level === 'extreme' ? 'selected' : ''}>Muito ativo</option>
        </select>
      </div>
      <div id="ep-error" class="form-error"></div>
      <button class="btn btn-primary btn-full" id="ep-save">Salvar</button>
      <button class="btn btn-secondary btn-full" style="margin-top:8px" id="ep-cancel">Cancelar</button>
    </div>
  `;

  $('#ep-save').addEventListener('click', async () => {
    const data = {
      name: $('#ep-name').value.trim(),
      sex: document.querySelector('input[name="ep-sex"]:checked')?.value || 'M',
      age: parseInt($('#ep-age').value),
      height: parseInt($('#ep-height').value),
      weight: parseFloat($('#ep-weight').value),
      activity_level: $('#ep-activity').value
    };
    const res = await api('PUT', '/users/me', data);
    if (res && !res._error) {
      state.user = res.user || res;
      renderPerfil();
    } else {
      $('#ep-error').textContent = res?.error || 'Erro ao salvar';
    }
  });

  $('#ep-cancel').addEventListener('click', () => { form.style.display = 'none'; });
}

// --- TRACKING ---
async function loadTracking() {
  const data = await api('GET', '/tracking');
  if (data && !data._error) {
    state.trackingEntries = Array.isArray(data) ? data : (data.entries || []);
  }
}

function renderTracking() {
  const page = $('#page-tracking');
  const entries = state.trackingEntries;
  const energyEmojis = ['😴', '😐', '🙂', '😊', '🔥'];
  const sleepEmojis = ['😵', '😪', '😐', '😴', '💤'];

  let html = `
    <h2 class="section-title">Evolucao</h2>
    <div class="tracking-form">
      <h3>Novo registro</h3>
      <div class="field"><label>Data</label><input type="date" id="tk-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="field-row">
        <div class="field"><label>Peso (kg)</label><input type="number" id="tk-weight" step="0.1" placeholder="80.0"></div>
        <div class="field"><label>Cintura (cm)</label><input type="number" id="tk-waist" placeholder="85"></div>
      </div>
      <div class="field"><label>Quadril (cm)</label><input type="number" id="tk-hip" placeholder="95"></div>
      <div class="field">
        <label>Energia</label>
        <div class="emoji-row" id="tk-energy-row">
          ${energyEmojis.map((e, i) => `<button type="button" class="emoji-btn" data-val="${i + 1}">${e}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Qualidade do sono</label>
        <div class="emoji-row" id="tk-sleep-row">
          ${sleepEmojis.map((e, i) => `<button type="button" class="emoji-btn" data-val="${i + 1}">${e}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>Observacoes</label><textarea id="tk-notes" rows="2" placeholder="Como foi o dia..."></textarea></div>
      <button class="btn btn-primary btn-full" id="tk-submit">Registrar</button>
    </div>
  `;

  // Summary
  if (entries.length >= 2) {
    const first = entries[entries.length - 1];
    const last = entries[0];
    const diff = (last.weight - first.weight).toFixed(1);
    const imcI = first.weight && state.user?.height ? calcIMC(first.weight, state.user.height).toFixed(1) : '—';
    const imcF = last.weight && state.user?.height ? calcIMC(last.weight, state.user.height).toFixed(1) : '—';

    html += `
      <div class="summary-card">
        <div><div class="summary-val">${first.weight}kg</div><div class="summary-label">Peso inicial</div></div>
        <div><div class="summary-val">${last.weight}kg</div><div class="summary-label">Peso atual</div></div>
        <div><div class="summary-val" style="color:${parseFloat(diff) <= 0 ? 'var(--g3)' : 'var(--coral)'}">${diff > 0 ? '+' : ''}${diff}kg</div><div class="summary-label">Diferenca</div></div>
      </div>
      <div class="summary-card" style="margin-top:8px">
        <div><div class="summary-val">${imcI}</div><div class="summary-label">IMC inicial</div></div>
        <div><div class="summary-val">${imcF}</div><div class="summary-label">IMC atual</div></div>
        <div><div class="summary-val">${entries.length}</div><div class="summary-label">Registros</div></div>
      </div>
    `;
  }

  // Chart
  if (entries.length > 0) {
    const chartEntries = entries.slice(0, 14).reverse();
    const weights = chartEntries.map(e => e.weight).filter(Boolean);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;

    html += `
      <div class="chart-container" style="margin-top:16px">
        <h3>Peso ao longo do tempo</h3>
        <div class="bar-chart">
          ${chartEntries.map(e => {
            const pct = ((e.weight - minW) / range) * 100;
            const dateStr = new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            return `<div class="bar-row">
              <span class="bar-label">${dateStr}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 5)}%"><span class="bar-val">${e.weight}</span></div></div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // History
  html += `<h3 class="section-title">Historico</h3><div class="tracking-list">`;
  if (entries.length === 0) {
    html += `<p style="color:var(--ts);text-align:center;padding:20px">Nenhum registro ainda.</p>`;
  } else {
    entries.forEach((entry, i) => {
      const prev = entries[i + 1];
      const delta = prev ? (entry.weight - prev.weight).toFixed(1) : null;
      const dateStr = new Date(entry.date).toLocaleDateString('pt-BR');
      html += `
        <div class="tracking-entry">
          <div class="te-left">
            <div class="te-date">${dateStr}</div>
            <div class="te-details">
              ${entry.waist ? `Cint: ${entry.waist}cm` : ''}
              ${entry.hip ? ` | Quad: ${entry.hip}cm` : ''}
              ${entry.energy ? ` | E:${energyEmojis[entry.energy - 1] || ''}` : ''}
              ${entry.sleep_quality ? ` | S:${sleepEmojis[entry.sleep_quality - 1] || ''}` : ''}
            </div>
            ${entry.notes ? `<div class="te-details">${esc(entry.notes)}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div class="te-weight">${entry.weight}kg</div>
            ${delta !== null ? `<div class="te-delta ${parseFloat(delta) <= 0 ? 'down' : 'up'}">${delta > 0 ? '+' : ''}${delta}kg</div>` : ''}
            <button class="te-delete" data-id="${entry.id || entry._id}">excluir</button>
          </div>
        </div>
      `;
    });
  }
  html += `</div>`;

  page.innerHTML = html;

  // Bind events
  let selectedEnergy = 0;
  let selectedSleep = 0;

  page.querySelectorAll('#tk-energy-row .emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedEnergy = parseInt(btn.dataset.val);
      page.querySelectorAll('#tk-energy-row .emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  page.querySelectorAll('#tk-sleep-row .emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSleep = parseInt(btn.dataset.val);
      page.querySelectorAll('#tk-sleep-row .emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  const submitBtn = page.querySelector('#tk-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const body = {
        date: page.querySelector('#tk-date').value,
        weight: parseFloat(page.querySelector('#tk-weight').value),
        waist: parseFloat(page.querySelector('#tk-waist').value) || null,
        hip: parseFloat(page.querySelector('#tk-hip').value) || null,
        energy: selectedEnergy || null,
        sleep_quality: selectedSleep || null,
        notes: page.querySelector('#tk-notes').value.trim() || null
      };
      if (!body.weight) return;

      const res = await api('POST', '/tracking', body);
      if (res && !res._error) {
        await loadTracking();
        renderTracking();
      }
    });
  }

  page.querySelectorAll('.te-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este registro?')) return;
      const id = btn.dataset.id;
      const res = await api('DELETE', `/tracking/${id}`);
      if (res && !res._error) {
        await loadTracking();
        renderTracking();
      }
    });
  });
}

// --- REGRAS ---
function renderRegras() {
  const page = $('#page-regras');
  const diet = state.user?.diet_type || 'normal';
  const di = DIET_INFO[diet] || DIET_INFO.normal;
  const rules = DIET_RULES[diet] || DIET_RULES.normal;

  let html = `<h2 class="section-title">${di.icon} Regras — ${di.name}</h2>`;
  rules.forEach((rule, i) => {
    html += `
      <div class="rule-card">
        <div class="rule-num">${i + 1}</div>
        <div class="rule-text">${rule}</div>
      </div>
    `;
  });

  page.innerHTML = html;
}

// --- MERCADO ---
async function loadMarket(weekNum) {
  const [marketRes, checksRes] = await Promise.all([
    api('GET', `/market/${weekNum}`),
    api('GET', `/market/${weekNum}/checks`)
  ]);

  if (marketRes && !marketRes._error) {
    state.marketData = marketRes;
  }
  if (checksRes && !checksRes._error) {
    state.marketChecks = checksRes.checks || {};
  }
}

function renderMercado() {
  const page = $('#page-mercado');
  const data = state.marketData;
  const checks = state.marketChecks;

  if (!data || !data.categories) {
    page.innerHTML = `<h2 class="section-title">🛒 Lista de Mercado</h2><p style="color:var(--ts);text-align:center;padding:40px 0">Lista nao disponivel para esta semana.</p>`;
    return;
  }

  // Calculate progress
  let totalItems = 0;
  let checkedItems = 0;
  data.categories.forEach(cat => {
    (cat.items || []).forEach(item => {
      totalItems++;
      if (checks[item.key]) checkedItems++;
    });
  });
  const pct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  let html = `
    <h2 class="section-title">🛒 Lista de Mercado — Semana ${state.currentWeek}</h2>
    <div class="market-progress">
      <div class="market-progress-text"><span>${checkedItems} de ${totalItems} itens</span><span>${pct}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
  `;

  data.categories.forEach(cat => {
    html += `<div class="market-cat"><div class="market-cat-title">${cat.name}</div>`;
    (cat.items || []).forEach(item => {
      const isChecked = !!checks[item.key];
      html += `
        <div class="market-item${isChecked ? ' checked' : ''}" data-key="${item.key}">
          <div class="market-check">${isChecked ? '✓' : ''}</div>
          <span class="mi-name">${item.name}</span>
          ${item.qty ? `<span class="mi-qty">${item.qty}</span>` : ''}
        </div>
      `;
    });
    html += `</div>`;
  });

  html += `<button class="btn btn-secondary btn-full market-reset" id="market-reset-btn">Limpar marcacoes desta semana</button>`;

  page.innerHTML = html;

  // Bind events
  page.querySelectorAll('.market-item').forEach(el => {
    el.addEventListener('click', () => toggleMarketItem(el.dataset.key));
  });

  const resetBtn = page.querySelector('#market-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => resetMarketWeek(state.currentWeek));
  }
}

async function toggleMarketItem(itemKey) {
  const currentlyChecked = !!state.marketChecks[itemKey];
  state.marketChecks[itemKey] = !currentlyChecked;
  renderMercado();

  await api('POST', '/market/check', {
    weekNum: state.currentWeek,
    itemKey: itemKey,
    checked: !currentlyChecked
  });
}

async function resetMarketWeek(weekNum) {
  if (!confirm('Limpar todas as marcacoes desta semana?')) return;
  const res = await api('DELETE', `/market/${weekNum}/checks`);
  if (res && !res._error) {
    state.marketChecks = {};
    renderMercado();
  }
}

// --- CONFIG ---
function renderConfig() {
  const page = $('#page-config');
  const u = state.user || {};
  const di = DIET_INFO[u.diet_type] || DIET_INFO.normal;

  let html = `
    <h2 class="section-title">Configuracoes</h2>
    <div class="config-section">
      <h3>Conta</h3>
      <div class="config-item"><span>${esc(u.name || 'Usuario')}</span><span style="color:var(--ts)">${esc(u.email || '')}</span></div>
    </div>
    <div class="config-section">
      <h3>Dieta</h3>
      <div class="config-item"><span>Dieta atual: <span class="diet-badge ${di.badge}">${di.icon} ${di.name}</span></span></div>
      <div class="config-item" id="cfg-change-diet"><span>Trocar dieta</span><span class="ci-arrow">›</span></div>
      <div id="cfg-diet-picker" style="display:none;padding:12px 0"></div>
      <div class="config-item" id="cfg-redo-quiz"><span>Refazer questionario</span><span class="ci-arrow">›</span></div>
    </div>
    <div class="config-section">
      <h3>Perfil</h3>
      <div class="config-item" id="cfg-edit-profile"><span>Editar perfil</span><span class="ci-arrow">›</span></div>
      <div class="config-item" id="cfg-edit-prefs"><span>Editar preferencias alimentares</span><span class="ci-arrow">›</span></div>
    </div>
    <div class="config-section">
      <h3>Aparencia</h3>
      <div class="theme-toggle">
        <span>Modo claro</span>
        <div class="toggle-switch${getTheme() === 'light' ? ' on' : ''}" id="cfg-theme-toggle"></div>
      </div>
    </div>
    <div class="config-section">
      <h3>Dados</h3>
      <div class="config-item" id="cfg-export"><span>Exportar dados (JSON)</span><span class="ci-arrow">›</span></div>
    </div>
    <button class="btn btn-danger btn-full" id="cfg-logout" style="margin-top:20px">Sair da conta</button>
  `;

  page.innerHTML = html;

  // Change diet
  $('#cfg-change-diet').addEventListener('click', () => {
    const picker = $('#cfg-diet-picker');
    if (picker.style.display === 'none') {
      picker.style.display = '';
      picker.innerHTML = Object.entries(DIET_INFO).map(([key, d]) =>
        `<div class="diet-card${key === u.diet_type ? ' selected' : ''}" data-diet="${key}">
          <h4>${d.icon} ${d.name}</h4>
          <p>${d.desc}</p>
        </div>`
      ).join('');

      picker.querySelectorAll('.diet-card').forEach(card => {
        card.addEventListener('click', async () => {
          const newDiet = card.dataset.diet;
          const res = await api('PUT', '/users/me/diet', { diet_type: newDiet });
          if (res && !res._error) {
            state.user.diet_type = newDiet;
            state.mealPlan = null;
            state.marketData = null;
            buildDayStrip();
            renderConfig();
          }
        });
      });
    } else {
      picker.style.display = 'none';
    }
  });

  // Redo quiz
  $('#cfg-redo-quiz').addEventListener('click', () => {
    state.quizStep = 1;
    state.quizAnswers = {};
    state.onboardingStep = 3;
    showOnboarding();
  });

  // Edit profile
  $('#cfg-edit-profile').addEventListener('click', () => {
    showPage('perfil');
    setTimeout(() => showEditProfileForm(), 100);
  });

  // Edit preferences
  $('#cfg-edit-prefs').addEventListener('click', () => {
    state.onboardingStep = 2;
    showOnboarding();
  });

  // Export
  $('#cfg-export').addEventListener('click', () => {
    const data = {
      user: state.user,
      tracking: state.trackingEntries,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plano-dieta-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Theme toggle
  const themeToggle = $('#cfg-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Logout
  $('#cfg-logout').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja sair?')) logout();
  });
}

// --- INIT ---
async function init() {
  // Splash auto-hide
  setTimeout(() => {
    const splash = $('#splash');
    if (splash) splash.classList.add('gone');
  }, 1200);

  // Auth form toggles
  $('#show-register').addEventListener('click', (e) => {
    e.preventDefault();
    $('#login-form').style.display = 'none';
    $('#register-form').style.display = '';
  });
  $('#show-login').addEventListener('click', (e) => {
    e.preventDefault();
    $('#register-form').style.display = 'none';
    $('#login-form').style.display = '';
  });

  // Auth form submits
  $('#login-form').addEventListener('submit', handleLogin);
  $('#register-form').addEventListener('submit', handleRegister);

  // Onboarding navigation
  $('#ob-back-btn').addEventListener('click', () => {
    if (state.onboardingStep === 3 && state.quizStep > 1) {
      quizPrev();
    } else {
      prevOnboardingStep();
    }
  });
  $('#ob-next-1').addEventListener('click', nextOnboardingStep);
  $('#ob-next-2').addEventListener('click', nextOnboardingStep);
  $('#quiz-next').addEventListener('click', quizNext);
  $('#quiz-prev').addEventListener('click', quizPrev);

  // Bottom nav
  $$('.nbtn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // Check auth
  if (!state.token) {
    showAuth();
    return;
  }

  const data = await api('GET', '/users/me');
  if (!data || data._error) return;

  state.user = data.user || data;

  if (!state.user.diet_type || !state.user.quiz_result?.recommended) {
    showOnboarding();
    return;
  }

  showApp();
}

// Boot
document.addEventListener('DOMContentLoaded', init);
