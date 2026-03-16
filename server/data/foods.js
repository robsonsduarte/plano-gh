import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// slots: which meal slots this food is appropriate for
// cafe=breakfast, lanche=snack, almoco=lunch, jantar=dinner, ceia=supper, any=all
const CURATED_FOODS = [
  // PROTEINS
  { id:'eggs', name:'Ovos', serving:'3 unidades', cat:'protein', kcal:210, prot:18, carb:1, fat:15, diets:['N','K','C','IF'], tags:['gh'], slots:['cafe','almoco','jantar'], preps:['mexidos com curcuma','cozidos','omelete com espinafre'] },
  { id:'chicken', name:'Frango (peito)', serving:'160g', cat:'protein', kcal:264, prot:40, carb:0, fat:6, diets:['N','K','C','IF'], tags:[], slots:['almoco','jantar'], preps:['grelhado com ervas','desfiado','ao forno com curcuma'] },
  { id:'salmon', name:'Salmao', serving:'130g', cat:'protein', kcal:260, prot:26, carb:0, fat:17, diets:['N','K','C','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['grelhado com limao','ao forno com gengibre','com curcuma'] },
  { id:'tuna', name:'Atum ao natural', serving:'1 lata (140g)', cat:'protein', kcal:180, prot:30, carb:0, fat:6, diets:['N','K','C','IF'], tags:[], slots:['almoco','jantar'], preps:['ao natural','grelhado'] },
  { id:'tilapia', name:'Tilapia', serving:'160g', cat:'protein', kcal:170, prot:34, carb:0, fat:3, diets:['N','K','C','IF'], tags:[], slots:['almoco','jantar'], preps:['grelhada com ervas','ao forno'] },
  { id:'beef', name:'Carne bovina magra', serving:'130g', cat:'protein', kcal:250, prot:32, carb:0, fat:13, diets:['N','K','C','IF'], tags:[], slots:['almoco','jantar'], preps:['grelhada','assada','contrafile'] },
  { id:'ground_beef', name:'Carne moida magra', serving:'130g', cat:'protein', kcal:230, prot:28, carb:0, fat:13, diets:['N','K','C','IF'], tags:[], slots:['almoco','jantar'], preps:['refogada com alho','com brocolis e pimentao'] },
  { id:'sardine', name:'Sardinha', serving:'1 lata (120g)', cat:'protein', kcal:190, prot:22, carb:0, fat:11, diets:['N','K','C','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['em conserva (agua)','grelhada'] },
  { id:'turkey', name:'Peru (peito)', serving:'160g', cat:'protein', kcal:240, prot:38, carb:0, fat:8, diets:['N','K','C','IF'], tags:[], slots:['almoco','jantar'], preps:['grelhado','assado'] },
  { id:'whey', name:'Whey protein', serving:'1 dose (25g)', cat:'protein', kcal:100, prot:22, carb:3, fat:1, diets:['N','K','IF'], tags:[], slots:['cafe','lanche'], preps:['com agua','com leite vegetal'] },
  { id:'greek_yogurt', name:'Iogurte grego natural', serving:'130g', cat:'protein', kcal:90, prot:12, carb:5, fat:3, diets:['N','K','IF'], tags:['gh'], slots:['cafe','lanche','ceia'], preps:['puro','com frutas','com sementes'] },
  { id:'cottage', name:'Queijo cottage', serving:'150g', cat:'protein', kcal:110, prot:16, carb:4, fat:3, diets:['N','K','IF'], tags:['gh'], slots:['cafe','lanche'], preps:['puro','com ervas'] },
  { id:'bacon', name:'Bacon', serving:'50g', cat:'protein', kcal:210, prot:12, carb:0, fat:18, diets:['K','C'], tags:[], slots:['cafe','almoco'], preps:['crocante','grelhado'] },
  { id:'picanha', name:'Picanha magra', serving:'130g', cat:'protein', kcal:260, prot:30, carb:0, fat:15, diets:['N','K','C','IF'], tags:[], slots:['almoco','jantar'], preps:['grelhada','assada'] },

  // VEGETABLES — all go with almoco/jantar
  { id:'broccoli', name:'Brocolis', serving:'100g', cat:'vegetable', kcal:34, prot:3, carb:7, fat:0, diets:['N','K','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['no vapor','refogado com alho'] },
  { id:'spinach', name:'Espinafre', serving:'80g', cat:'vegetable', kcal:18, prot:2, carb:3, fat:0, diets:['N','K','IF'], tags:['gh'], slots:['almoco','jantar','cafe'], preps:['refogado','cru em salada'] },
  { id:'kale', name:'Couve', serving:'80g', cat:'vegetable', kcal:35, prot:3, carb:6, fat:1, diets:['N','K','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['refogada com alho','crua em salada'] },
  { id:'beet', name:'Beterraba', serving:'100g', cat:'vegetable', kcal:43, prot:2, carb:10, fat:0, diets:['N','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['cozida','assada','ralada crua'] },
  { id:'carrot', name:'Cenoura', serving:'80g', cat:'vegetable', kcal:33, prot:1, carb:8, fat:0, diets:['N','IF'], tags:[], slots:['almoco','jantar'], preps:['ralada','cozida','assada'] },
  { id:'zucchini', name:'Abobrinha', serving:'100g', cat:'vegetable', kcal:17, prot:1, carb:3, fat:0, diets:['N','K','IF'], tags:[], slots:['almoco','jantar'], preps:['grelhada','refogada','recheada'] },
  { id:'bell_pepper', name:'Pimentao', serving:'80g', cat:'vegetable', kcal:20, prot:1, carb:5, fat:0, diets:['N','K','IF'], tags:[], slots:['almoco','jantar'], preps:['cru em salada','refogado','assado'] },
  { id:'tomato', name:'Tomate', serving:'100g', cat:'vegetable', kcal:18, prot:1, carb:4, fat:0, diets:['N','K','IF'], tags:[], slots:['almoco','jantar','cafe'], preps:['em salada','cereja assado'] },
  { id:'mushroom', name:'Cogumelo', serving:'80g', cat:'vegetable', kcal:18, prot:2, carb:3, fat:0, diets:['N','K','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['salteado','grelhado'] },
  { id:'lettuce_mix', name:'Mix de folhas verdes', serving:'50g', cat:'vegetable', kcal:8, prot:1, carb:1, fat:0, diets:['N','K','IF'], tags:[], slots:['almoco','jantar'], preps:['salada'] },
  { id:'cauliflower', name:'Couve-flor', serving:'100g', cat:'vegetable', kcal:25, prot:2, carb:5, fat:0, diets:['N','K','IF'], tags:[], slots:['almoco','jantar'], preps:['no vapor','gratinada','pure'] },
  { id:'pumpkin', name:'Abobora', serving:'100g', cat:'vegetable', kcal:26, prot:1, carb:7, fat:0, diets:['N','IF'], tags:[], slots:['almoco','jantar'], preps:['assada','pure','sopa'] },

  // FRUITS
  { id:'banana', name:'Banana', serving:'1 unidade', cat:'fruit', kcal:105, prot:1, carb:27, fat:0, diets:['N','IF'], tags:['gh'], slots:['cafe','lanche','ceia'], preps:['in natura','amassada'] },
  { id:'apple', name:'Maca', serving:'1 unidade', cat:'fruit', kcal:95, prot:0, carb:25, fat:0, diets:['N','IF'], tags:[], slots:['lanche','cafe'], preps:['in natura','verde'] },
  { id:'strawberry', name:'Morangos', serving:'100g', cat:'fruit', kcal:33, prot:1, carb:8, fat:0, diets:['N','K','IF'], tags:['gh'], slots:['cafe','lanche','ceia'], preps:['in natura'] },
  { id:'blueberry', name:'Mirtilos', serving:'80g', cat:'fruit', kcal:46, prot:1, carb:12, fat:0, diets:['N','K','IF'], tags:['gh'], slots:['cafe','lanche','ceia'], preps:['in natura','com iogurte'] },
  { id:'orange', name:'Laranja', serving:'1 unidade', cat:'fruit', kcal:62, prot:1, carb:15, fat:0, diets:['N','IF'], tags:[], slots:['lanche'], preps:['in natura'] },
  { id:'avocado', name:'Abacate', serving:'1/3 unidade', cat:'fruit', kcal:107, prot:1, carb:6, fat:10, diets:['N','K','C','IF'], tags:['gh'], slots:['cafe','almoco','lanche'], preps:['amassado','em fatias'] },
  { id:'acai', name:'Acai (polpa)', serving:'100g', cat:'fruit', kcal:70, prot:1, carb:4, fat:5, diets:['N','IF'], tags:['gh'], slots:['lanche','cafe'], preps:['sem acucar'] },
  { id:'cherry', name:'Cereja', serving:'80g', cat:'fruit', kcal:40, prot:1, carb:10, fat:0, diets:['N','IF'], tags:['gh'], slots:['ceia','lanche'], preps:['in natura','suco sem acucar'] },
  { id:'raspberry', name:'Framboesas', serving:'80g', cat:'fruit', kcal:42, prot:1, carb:10, fat:0, diets:['N','K','IF'], tags:['gh'], slots:['cafe','lanche','ceia'], preps:['in natura'] },
  { id:'pear', name:'Pera', serving:'1 unidade', cat:'fruit', kcal:100, prot:1, carb:27, fat:0, diets:['N','IF'], tags:[], slots:['lanche'], preps:['in natura'] },
  { id:'watermelon', name:'Melancia', serving:'150g', cat:'fruit', kcal:45, prot:1, carb:11, fat:0, diets:['N','IF'], tags:[], slots:['lanche'], preps:['in natura'] },
  // Frutas tropicais e comuns no Brasil
  { id:'tangerine', name:'Tangerina', serving:'1 unidade', cat:'fruit', kcal:47, prot:1, carb:12, fat:0, diets:['N','IF'], tags:[], slots:['lanche','cafe'], preps:['in natura'] },
  { id:'mango', name:'Manga', serving:'1/2 unidade', cat:'fruit', kcal:99, prot:1, carb:25, fat:0, diets:['N','IF'], tags:[], slots:['lanche','cafe'], preps:['in natura','em cubos'] },
  { id:'papaya', name:'Mamao papaya', serving:'1/2 unidade', cat:'fruit', kcal:60, prot:1, carb:15, fat:0, diets:['N','IF'], tags:[], slots:['cafe','lanche'], preps:['in natura','com granola'] },
  { id:'pineapple', name:'Abacaxi', serving:'2 fatias', cat:'fruit', kcal:50, prot:1, carb:13, fat:0, diets:['N','IF'], tags:[], slots:['lanche','ceia'], preps:['in natura','grelhado'] },
  { id:'guava', name:'Goiaba', serving:'1 unidade', cat:'fruit', kcal:68, prot:3, carb:14, fat:1, diets:['N','IF'], tags:[], slots:['lanche','cafe'], preps:['in natura','com queijo branco'] },
  { id:'passion_fruit', name:'Maracuja (polpa)', serving:'100g', cat:'fruit', kcal:97, prot:2, carb:23, fat:1, diets:['N','IF'], tags:[], slots:['lanche','ceia'], preps:['in natura','suco sem acucar'] },
  { id:'grape', name:'Uva', serving:'1 cacho pequeno (100g)', cat:'fruit', kcal:69, prot:1, carb:18, fat:0, diets:['N','IF'], tags:['gh'], slots:['lanche','ceia'], preps:['in natura'] },
  { id:'melon', name:'Melao', serving:'150g', cat:'fruit', kcal:51, prot:1, carb:12, fat:0, diets:['N','IF'], tags:[], slots:['lanche','cafe'], preps:['in natura','em cubos'] },
  { id:'kiwi', name:'Kiwi', serving:'1 unidade', cat:'fruit', kcal:42, prot:1, carb:10, fat:0, diets:['N','IF'], tags:['gh'], slots:['lanche','ceia','cafe'], preps:['in natura'] },
  { id:'persimmon', name:'Caqui', serving:'1 unidade', cat:'fruit', kcal:71, prot:1, carb:19, fat:0, diets:['N','IF'], tags:[], slots:['lanche'], preps:['in natura'] },
  { id:'jabuticaba', name:'Jabuticaba', serving:'100g', cat:'fruit', kcal:58, prot:1, carb:14, fat:0, diets:['N','IF'], tags:['gh'], slots:['lanche'], preps:['in natura'] },
  { id:'cashew_fruit', name:'Caju', serving:'1 unidade', cat:'fruit', kcal:43, prot:1, carb:10, fat:0, diets:['N','IF'], tags:[], slots:['lanche'], preps:['in natura','suco'] },
  { id:'coconut', name:'Coco fresco', serving:'50g', cat:'fruit', kcal:177, prot:2, carb:8, fat:17, diets:['N','K','IF'], tags:[], slots:['lanche','cafe'], preps:['in natura','ralado'] },
  { id:'plum', name:'Ameixa', serving:'2 unidades', cat:'fruit', kcal:46, prot:1, carb:11, fat:0, diets:['N','IF'], tags:[], slots:['lanche','ceia'], preps:['in natura'] },
  { id:'lemon', name:'Limao (suco)', serving:'1 unidade', cat:'fruit', kcal:11, prot:0, carb:4, fat:0, diets:['N','K','IF'], tags:[], slots:['almoco','jantar','lanche'], preps:['suco na agua','temperando salada'] },
  { id:'pomegranate', name:'Roma', serving:'1/2 unidade', cat:'fruit', kcal:65, prot:1, carb:16, fat:1, diets:['N','IF'], tags:['gh'], slots:['lanche'], preps:['in natura','sementes em salada'] },

  // CARBS
  { id:'brown_rice', name:'Arroz integral', serving:'3 colheres', cat:'carb', kcal:150, prot:3, carb:32, fat:1, diets:['N','IF'], tags:[], slots:['almoco','jantar'], preps:['cozido'] },
  { id:'oats', name:'Aveia em flocos', serving:'40g', cat:'carb', kcal:150, prot:5, carb:27, fat:3, diets:['N','IF'], tags:['gh'], slots:['cafe'], preps:['com frutas','mingau','em vitamina'] },
  { id:'quinoa', name:'Quinoa', serving:'3 colheres', cat:'carb', kcal:120, prot:4, carb:21, fat:2, diets:['N','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['cozida','em salada'] },
  { id:'sweet_potato', name:'Batata-doce', serving:'1 media', cat:'carb', kcal:115, prot:2, carb:27, fat:0, diets:['N','IF'], tags:[], slots:['almoco','jantar'], preps:['cozida','assada'] },
  { id:'lentils', name:'Lentilha', serving:'4 colheres', cat:'carb', kcal:140, prot:10, carb:24, fat:0, diets:['N','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['cozida','ao curry','com legumes'] },
  { id:'chickpeas', name:'Grao-de-bico', serving:'4 colheres', cat:'carb', kcal:150, prot:8, carb:25, fat:2, diets:['N','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['cozido','assado crocante','com azeite'] },
  { id:'black_beans', name:'Feijao', serving:'3 colheres', cat:'carb', kcal:120, prot:8, carb:20, fat:0, diets:['N','IF'], tags:[], slots:['almoco','jantar'], preps:['cozido','tropeiro'] },
  { id:'whole_bread', name:'Pao integral', serving:'1 fatia', cat:'carb', kcal:80, prot:4, carb:14, fat:1, diets:['N','IF'], tags:[], slots:['cafe','lanche'], preps:['com abacate','com pasta de amendoim','torrada'] },
  { id:'granola', name:'Granola sem acucar', serving:'25g', cat:'carb', kcal:110, prot:3, carb:18, fat:4, diets:['N','IF'], tags:[], slots:['cafe','lanche'], preps:['com iogurte'] },
  { id:'tapioca', name:'Tapioca', serving:'30g', cat:'carb', kcal:100, prot:0, carb:26, fat:0, diets:['N','IF'], tags:[], slots:['cafe','lanche'], preps:['com recheio proteico'] },

  // FATS — most are any-slot (snacks, salads, cooking)
  { id:'olive_oil', name:'Azeite extra virgem', serving:'1 colher', cat:'fat', kcal:120, prot:0, carb:0, fat:14, diets:['N','K','C','IF'], tags:['gh'], slots:['almoco','jantar'], preps:['regado sobre salada','para cozinhar'] },
  { id:'peanuts', name:'Amendoim natural', serving:'25g', cat:'fat', kcal:140, prot:6, carb:5, fat:12, diets:['N','K','IF'], tags:['gh'], slots:['lanche','ceia'], preps:['in natura','torrado sem sal'] },
  { id:'mixed_nuts', name:'Castanhas mistas', serving:'25g', cat:'fat', kcal:160, prot:4, carb:6, fat:14, diets:['N','K','IF'], tags:['gh'], slots:['lanche','cafe'], preps:['in natura'] },
  { id:'peanut_butter', name:'Pasta de amendoim', serving:'1 colher', cat:'fat', kcal:90, prot:4, carb:3, fat:8, diets:['N','K','IF'], tags:['gh'], slots:['cafe','lanche','ceia'], preps:['com pao integral','com banana','com frutas'] },
  { id:'pumpkin_seeds', name:'Sementes de abobora', serving:'15g', cat:'fat', kcal:80, prot:4, carb:2, fat:7, diets:['N','K','IF'], tags:['gh'], slots:['lanche','cafe','almoco'], preps:['in natura','em salada'] },
  { id:'chia_seeds', name:'Chia', serving:'10g', cat:'fat', kcal:49, prot:2, carb:4, fat:3, diets:['N','K','IF'], tags:['gh'], slots:['cafe','lanche'], preps:['em vitamina','com iogurte','com aveia'] },
  { id:'coconut_oil', name:'Oleo de coco', serving:'1 colher', cat:'fat', kcal:120, prot:0, carb:0, fat:14, diets:['K','C'], tags:[], slots:['cafe','almoco','jantar'], preps:['para cozinhar','no cafe'] },
  { id:'butter', name:'Manteiga', serving:'15g', cat:'fat', kcal:108, prot:0, carb:0, fat:12, diets:['K','C'], tags:[], slots:['cafe','almoco','jantar'], preps:['para cozinhar','no cafe'] },
  { id:'brazil_nuts', name:'Castanha do Para', serving:'3 unidades', cat:'fat', kcal:100, prot:2, carb:2, fat:10, diets:['N','K','IF'], tags:['gh'], slots:['lanche','cafe'], preps:['in natura'] },
  { id:'flaxseed', name:'Linhaca', serving:'10g', cat:'fat', kcal:53, prot:2, carb:3, fat:4, diets:['N','K','IF'], tags:[], slots:['cafe','lanche','almoco'], preps:['triturada em vitamina','em salada'] },
];

// Load TACO (Tabela Brasileira de Composição de Alimentos) — 542 foods
const __dirname = dirname(fileURLToPath(import.meta.url));
let TACO_FOODS = [];
try {
  TACO_FOODS = JSON.parse(readFileSync(join(__dirname, 'taco-foods.json'), 'utf8'));
} catch (e) {
  process.stderr.write('Warning: taco-foods.json not found, using curated foods only\n');
}

// Merge: curated foods take priority (better preps/slots), TACO fills the gaps
const curatedIds = new Set(CURATED_FOODS.map(f => f.id));
export const FOODS = [
  ...CURATED_FOODS,
  ...TACO_FOODS.filter(f => !curatedIds.has(f.id))
];

export const MEAL_TEMPLATES = {
  normal: {
    cafe: { structure: ['protein','carb','fruit'], drink: 'Cafe preto sem acucar', pctKcal: 0.20 },
    lanche_manha: { structure: ['fat','fruit'], pctKcal: 0.10 },
    almoco: { structure: ['protein','carb','vegetable','fat'], pctKcal: 0.30 },
    lanche_tarde: { structure: ['protein','fruit|fat'], pctKcal: 0.10 },
    jantar: { structure: ['protein','vegetable','fat'], pctKcal: 0.22 },
    ceia: { structure: ['fruit'], drink: 'Cha de camomila', pctKcal: 0.08 }
  },
  keto: {
    cafe: { structure: ['protein','fat','fruit'], drink: 'Cafe com oleo de coco', pctKcal: 0.30 },
    almoco: { structure: ['protein','vegetable','fat'], pctKcal: 0.35 },
    lanche: { structure: ['fat','protein'], pctKcal: 0.10 },
    jantar: { structure: ['protein','vegetable','fat'], pctKcal: 0.25 }
  },
  carnivore: {
    primeira: { structure: ['protein','fat'], drink: 'Cafe preto', pctKcal: 0.35 },
    principal: { structure: ['protein','protein','fat'], pctKcal: 0.40 },
    ultima: { structure: ['protein','fat'], pctKcal: 0.25 }
  },
  if_normal: {
    cafe: { structure: ['protein','carb','fruit'], drink: 'Cafe preto', pctKcal: 0.20 },
    lanche_manha: { structure: ['fat','fruit'], pctKcal: 0.10 },
    almoco: { structure: ['protein','carb','vegetable','fat'], pctKcal: 0.30 },
    lanche_tarde: { structure: ['protein','fruit|fat'], pctKcal: 0.10 },
    jantar: { structure: ['protein','vegetable','fat'], pctKcal: 0.22 },
    ceia: { structure: ['fruit'], drink: 'Cha de camomila', pctKcal: 0.08 }
  },
  if_fasting: {
    quebra_jejum: { structure: ['protein','fat','carb'], drink: 'Cafe preto', pctKcal: 0.30 },
    lanche: { structure: ['protein','fruit|fat'], pctKcal: 0.15 },
    principal: { structure: ['protein','carb','vegetable','fat'], pctKcal: 0.35 },
    ultima: { structure: ['protein','vegetable','fat'], pctKcal: 0.20 }
  }
};

export const DIET_MACROS = {
  normal:    { carbPct: 0.50, protPct: 0.25, fatPct: 0.25 },
  keto:      { carbPct: 0.05, protPct: 0.25, fatPct: 0.70 },
  carnivore: { carbPct: 0.00, protPct: 0.30, fatPct: 0.70 },
  if:        { carbPct: 0.45, protPct: 0.30, fatPct: 0.25 }
};

export const ACTIVITY_MULT = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extreme: 1.9
};

export const IF_FASTING_DAYS = {
  1: [],
  2: [3, 5],
  3: [1, 3, 5],
  4: [3, 5]
};

export const DIET_RULES = {
  normal: [
    'Faca 5-6 refeicoes por dia com intervalos de 3 horas entre elas.',
    'Preencha metade do prato com vegetais e salada em todas as refeicoes principais.',
    'Prefira carboidratos integrais e evite refinados como pao branco e acucar.',
    'Consuma pelo menos 2 litros de agua por dia, distribuidos ao longo do dia.',
    'Inclua uma fonte de proteina em cada refeicao para manter a saciedade.',
    'Evite alimentos ultraprocessados, embutidos e refrigerantes.',
    'Coma devagar, mastigando bem cada garfada por pelo menos 20 minutos.',
    'Nao pule refeicoes — isso desregula o metabolismo e aumenta a fome.'
  ],
  keto: [
    'Mantenha o consumo de carboidratos abaixo de 20-30g liquidos por dia.',
    'Aumente o consumo de gorduras saudaveis como azeite, abacate e castanhas.',
    'Beba muita agua e reponha eletrolitos (sodio, potassio, magnesio).',
    'Evite frutas com alto teor de acucar — prefira morangos, mirtilos e framboesas.',
    'Nao tenha medo da gordura — ela e sua principal fonte de energia na cetose.',
    'Nas primeiras 2 semanas voce pode sentir a "gripe keto" — e normal, hidrate-se.',
    'Leia rotulos com atencao — muitos produtos "light" tem carboidratos escondidos.',
    'Inclua vegetais de baixo carboidrato como brocolis, espinafre e couve-flor.'
  ],
  carnivore: [
    'Consuma apenas alimentos de origem animal: carnes, ovos, peixes e gordura animal.',
    'Prefira cortes gordurosos — a gordura e essencial nesta dieta para energia.',
    'Beba agua e cafe preto. Evite qualquer bebida com acucar ou adocante.',
    'Tempere apenas com sal. Ervas e especiarias sao opcionais e devem ser minimas.',
    'Coma ate saciedade — nao e necessario contar calorias rigorosamente.',
    'Nos primeiros dias, o intestino pode mudar o ritmo. Isso e normal e se ajusta.',
    'Orgaos como figado sao extremamente nutritivos — tente incluir 1-2x por semana.',
    'Se sentir fadiga na primeira semana, aumente o consumo de sal e gordura.'
  ],
  if: [
    'Nos dias de jejum, faca a ultima refeicao ate as 20h e a primeira apos as 12h do dia seguinte.',
    'Durante a janela de jejum, pode beber agua, cafe preto e cha sem acucar.',
    'Nao compense o jejum comendo em excesso — mantenha as porcoes normais.',
    'Comece gradualmente: semana 1 sem jejum, semana 2 com 2 dias, semana 3 com 3 dias.',
    'A refeicao que quebra o jejum deve ser leve — comece com proteina e gordura.',
    'Se sentir tontura ou mal-estar intenso, quebre o jejum com caldo de osso ou suco.',
    'O jejum intermitente nao e para todos — respeite os sinais do seu corpo.',
    'Mantenha a atividade fisica normal nos dias de jejum, mas evite treinos muito intensos.'
  ]
};

export const DIET_TIPS = {
  normal: [
    'Prepare as refeicoes da semana no domingo — meal prep economiza tempo e evita escolhas ruins.',
    'Troque o refrigerante por agua com gas e limao. Em 30 dias voce nem vai lembrar do refrigerante.',
    'Comer devagar ativa os hormonios de saciedade. Coloque o garfo na mesa entre as garfadas.',
    'Adicione curcuma e gengibre nas refeicoes — sao anti-inflamatorios naturais poderosos.',
    'Durma pelo menos 7 horas. Sono ruim aumenta o cortisol e a vontade de comer doces.',
    'Substitua doces por frutas com pasta de amendoim — satisfaz a vontade e nutre o corpo.',
    'Caminhadas de 20 minutos apos as refeicoes melhoram a digestao e controlam a glicemia.',
    'Tenha sempre snacks saudaveis a mao — castanhas e frutas evitam recaidas.',
    'Nao se pese todos os dias. O peso flutua naturalmente. Pese-se 1x por semana, em jejum.',
    'Cozinhar em casa e o maior hack de dieta. Voce controla ingredientes, porcoes e qualidade.'
  ],
  keto: [
    'Bacon e ovos no cafe da manha nao sao apenas permitidos — sao recomendados na keto.',
    'Manteiga no cafe (bulletproof) e uma forma rapida de atingir suas metas de gordura.',
    'Couve-flor e o melhor substituto low-carb: vira pure, arroz, pizza e ate massa.',
    'Mantenha eletrolitos em dia: coloque uma pitada de sal no agua, especialmente na primeira semana.',
    'Abacate e o superalimento da keto — gordura boa, fibra e potassio em um so alimento.',
    'Teste cetonas com fitas de urina nas primeiras semanas para confirmar que esta em cetose.',
    'Alface, rucula e espinafre tem carboidratos quase zero — coma a vontade.',
    'Se bater a vontade de doce, coma chocolate 85% cacau — 1-2 quadradinhos bastam.',
    'Prepare fat bombs com oleo de coco e cacau para os momentos de fome entre refeicoes.',
    'Na duvida, coma mais gordura. O erro mais comum na keto e comer pouca gordura.'
  ],
  carnivore: [
    'Picanha, costela e alcatra sao suas melhores amigas. Nao corte a gordura da carne.',
    'Ovos sao o alimento mais completo do mundo. 3-4 por dia e uma base excelente.',
    'Salmao e sardinha trazem omega-3 que a carne vermelha sozinha nao fornece.',
    'Se puder, compre carne de pasto — o perfil de gordura e muito superior.',
    'Caldo de osso caseiro e rico em colageno e minerais. Tome como sopa ou use para cozinhar.',
    'Nao tenha pressa de cortar tudo. Comece eliminando processados, depois graos, depois vegetais.',
    'Sal e o unico tempero obrigatorio. Use sal grosso ou sal rosa generosamente.',
    'Se o intestino prender, aumente a gordura. Se soltar demais, reduza um pouco.',
    'Carnes de orgaos (figado, coracao) sao os multivitaminicos naturais. Tente 1x por semana.',
    'Coma quando tiver fome, pare quando estiver satisfeito. A carnivore naturalmente regula o apetite.'
  ],
  if: [
    'Cafe preto e seu melhor amigo durante o jejum — zero calorias e suprime a fome.',
    'Os primeiros 3 dias sao os mais dificeis. Depois o corpo se adapta e a fome diminui.',
    'Quebre o jejum com proteina e gordura, nunca com carboidrato puro — evita pico de insulina.',
    'Agua com gas engana a fome durante o jejum. Adicione uma fatia de limao se quiser.',
    'Mantenha-se ocupado durante as horas de jejum — a fome e mais psicologica que fisica.',
    'Nao faca jejum todos os dias no inicio. 2-3 dias por semana e suficiente para resultados.',
    'Se treinar em jejum, faca exercicios leves. Treinos pesados reserve para os dias normais.',
    'O jejum melhora a autofagia — o processo de limpeza celular do corpo. E ciencia.',
    'Defina uma janela alimentar fixa (ex: 12h-20h) para criar rotina e facilitar a adesao.',
    'Se tiver um evento social em dia de jejum, troque o dia. Flexibilidade e chave para consistencia.'
  ]
};

export const MEAL_NAMES = {
  cafe: 'Cafe da Manha',
  lanche_manha: 'Lanche da Manha',
  almoco: 'Almoco',
  lanche_tarde: 'Lanche da Tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
  lanche: 'Lanche',
  primeira: 'Primeira Refeicao',
  principal: 'Refeicao Principal',
  ultima: 'Ultima Refeicao',
  quebra_jejum: 'Quebra do Jejum'
};

export const MEAL_TIMES = {
  cafe: '07:00',
  lanche_manha: '10:00',
  almoco: '12:30',
  lanche_tarde: '15:30',
  jantar: '19:00',
  ceia: '21:00',
  lanche: '15:00',
  primeira: '08:00',
  principal: '13:00',
  ultima: '19:00',
  quebra_jejum: '12:00'
};
