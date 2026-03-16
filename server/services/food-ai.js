import { chatCompletion } from './ai-client.js';

const SYSTEM_PROMPT = `Voce e um nutricionista brasileiro especializado em culinaria regional do Brasil.

CONTEXTO CULINARIO BRASILEIRO (use sempre):
- Arraia/raia = peixe de agua salgada usado em moquecas (NAO e arara que e ave)
- Moqueca = ensopado baiano/capixaba de peixe com leite de coco, dende, pimentao, tomate
- Lambreta = ostra de mangue comum na Bahia
- Sururu = marisco de mangue (mexilhao)
- Vatapa, caruru, acaraje, xinxim, bobo = pratos tipicos baianos
- Tucunare, pintado, dourado, robalo, badejo, pirarucu = peixes brasileiros

REGRA CRITICA — PORCAO INDIVIDUAL vs PRATO INTEIRO:
- Quando o usuario diz "comi moqueca de arraia", ele comeu UMA PORCAO servida no prato, NAO a panela inteira
- Estime os macros da PORCAO INDIVIDUAL que uma pessoa come (tipicamente 1 concha, 1-2 postas, 1 prato)
- NAO some todos os ingredientes da receita — estime o que CHEGA NO PRATO do usuario
- "2 postas de moqueca" = ~200g de peixe cozido no molho (nao 200g de peixe + 200ml de leite de coco + cebola + tomate)
- O molho que acompanha a posta e minimo (~2-3 colheres)

FORMATO — responda APENAS com JSON valido:
{
  "name": "Nome do alimento em portugues",
  "serving": "porcao individual tipica (ex: 1 posta ~150g, 1 concha, 1 prato raso)",
  "kcal": numero,
  "prot": numero em gramas,
  "carb": numero em gramas,
  "fat": numero em gramas,
  "confidence": "high" ou "medium" ou "low",
  "notes": "observacao breve (opcional)"
}
Se o usuario mencionar quantidade (ex: "2 postas"), use essa quantidade.
Se nao mencionar, assuma 1 porcao individual padrao.
Se for prato composto COM acompanhamentos separados (ex: "moqueca com arroz e pirão"), retorne array com cada item separado.
Arredonde para inteiros. NAO inclua markdown ou texto fora do JSON.`;

export async function estimateFromText(description) {
  try {
    const { text, provider } = await chatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Estime os macronutrientes para: ${description}` }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    if (!text) return { error: 'Nenhum provedor de IA disponivel' };
    const result = parseAIResponse(text);
    result.provider = provider;
    return result;
  } catch (err) {
    process.stderr.write(`Food AI text error: ${err.message}\n`);
    return { error: 'Erro ao consultar IA' };
  }
}

export async function estimateFromImage(base64Image, mimeType = 'image/jpeg') {
  try {
    const { text, provider } = await chatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identifique o(s) alimento(s) nesta foto e estime os macronutrientes de cada um.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      needsVision: true
    });
    if (!text) return { error: 'Nenhum provedor de IA disponivel' };
    const result = parseAIResponse(text);
    result.provider = provider;
    return result;
  } catch (err) {
    process.stderr.write(`Food AI image error: ${err.message}\n`);
    return { error: 'Erro ao analisar imagem' };
  }
}

function parseAIResponse(text) {
  try {
    let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return { items };
  } catch (e) {
    process.stderr.write(`Food AI parse error: ${e.message}\nRaw: ${text}\n`);
    return { error: 'Nao foi possivel interpretar a resposta da IA', raw: text };
  }
}
