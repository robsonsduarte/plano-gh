import { chatCompletion } from './ai-client.js';

const SYSTEM_PROMPT = `Voce e um nutricionista especializado em alimentos brasileiros.
Quando o usuario descrever um alimento (por nome ou foto), responda APENAS com um JSON valido:
{
  "name": "Nome do alimento em portugues",
  "serving": "porcao tipica (ex: 100g, 1 unidade, 1 prato)",
  "kcal": numero,
  "prot": numero em gramas,
  "carb": numero em gramas,
  "fat": numero em gramas,
  "confidence": "high" ou "medium" ou "low",
  "notes": "observacao breve sobre o alimento (opcional)"
}
Se for um prato composto (ex: foto de um prato feito), retorne um array de objetos, um por item identificado.
Valores devem ser para a porcao tipica informada. Arredonde para inteiros.
NAO inclua markdown, explicacoes ou texto fora do JSON.`;

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
