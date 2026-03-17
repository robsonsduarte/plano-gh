# Session Context — Plano Dieta

Checkpoint continuo do estado do projeto. Atualizado ao final de cada sessao.

## Estado Atual

- **Versao:** 2.0.0
- **Status:** Em producao, com usuarios ativos
- **Ultima sessao:** 2026-03-16
- **Ultimo fix:** Timezone UTC→BRT em meal logs + vazamento de estado entre dias
- **Proximo passo:** Avaliar melhorias prioritarias (ver Backlog)
- **Bloqueios:** OpenAI com quota estourada (429), fallback Groq ativo

## Ambiente

- **Producao:** https://dieta.invictagroup.com.br
- **Servidor:** robson-dev (SSH), PM2 process `plano-dieta`, porta 3003
- **Banco:** PostgreSQL local no servidor (admin:localdev123@127.0.0.1:5432/plano_dieta)
- **Local:** localhost:3000 (dev) / localhost:3003 (prod config)

## Usuarios Ativos

- Robson Duarte (robsonsduarte@gmail.com) — user_id 4
- Camila Fortuna (camila.fortuna.politec@gmail.com) — user_id 6

## Decisoes Recentes

- [2026-03-16] Usar `localDate()` em vez de `toISOString()` para datas — servidor UTC, usuarios BRT
- [2026-03-16] Limpar estado de mealLogs/loggedIndexes ao trocar dia no dayStrip
- [2026-03-16] Backend `adjustDayMeals` recebe `date` do request, nao calcula internamente

## Bugs Conhecidos / Riscos

- XSS potencial: `innerHTML` com dados da IA sem sanitizacao em app.js
- Payload de imagem base64 sem limite de tamanho
- Quiz scoring: frontend computa e envia resultado, backend nao revalida
- `app.js` com ~1700 linhas sem modularizacao
- Sem testes automatizados
- Ajustes da IA (adjustedMeals) nao persistem no banco — se perdem ao recarregar

## Backlog Prioritario

1. Sanitizar innerHTML com dados da IA (DOMPurify ou textContent)
2. Limitar payload de imagem (`express.json({ limit: '2mb' })`)
3. Persistir adjustedMeals no banco para sobreviver reloads
4. Paginacao no endpoint GET /tracking
5. Modularizar app.js (Vite ou esbuild)
6. Testes unitarios para nutrition.js, quiz-scorer.js, meal-generator.js
