# Inbox — Caixa de Ingestao Local

Coloque aqui o material bruto para processamento pelo DuarteOS.

## Estrutura

```
inbox/
  {autor-slug}/                    # Pasta por autor (lowercase, hifens)
    {tipo}/                        # PODCASTS, COURSES, ARTICLES, TRANSCRIPTS, etc
      {arquivo}.txt                # Conteudo bruto
  processed/                       # Arquivos ja processados (movidos aqui)
    {autor-slug}/
      {arquivo}.txt
```

## Como Usar

1. **Adicionar material:** copie arquivos .txt/.md para a pasta do autor
   ```
   inbox/naval-ravikant/PODCASTS/tim-ferriss-ep-412.txt
   inbox/alex-hormozi/COURSES/100m-offers-modulo-1.txt
   ```

2. **Verificar pendentes:** `/DUARTEOS:squad:ingest` (scan)

3. **Processar:** `/DUARTEOS:squad:ingest --process` (proximo) ou `--process-all`

4. **Organizar:** `/DUARTEOS:squad:ingest --organize` para arquivos soltos

## Regras

- **SO CONTEUDO LOCAL** — a IA processa SOMENTE o que esta na caixa
- **Rastreabilidade** — todo insight gerado referencia o arquivo fonte
- **Incremental** — processar 2x nao duplica insights
- **Organizado** — manter estrutura {autor}/{tipo}/ consistente

## Deteccao Automatica

| Padrao no nome | Tipo detectado |
|----------------|---------------|
| podcast, episode, ep, interview | PODCASTS |
| course, module, aula, lesson | COURSES |
| article, blog, post, essay | ARTICLES |
| transcript, transcricao | TRANSCRIPTS |
| book, livro, capitulo, chapter | BOOKS |
| talk, palestra, keynote, ted | TALKS |
| (sem padrao) | GENERAL |
