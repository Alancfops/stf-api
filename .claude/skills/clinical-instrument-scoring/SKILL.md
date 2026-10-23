---
name: clinical-instrument-scoring
description: Verifies correct implementation of clinical questionnaires (TUG, Katz, Berg, Tinetti, MEEM) — Zod payloads, scoring, classification, UI collection rules and tests against docs/clinical-protocols and docs/backend. Use when implementing or reviewing an instrument, questionnaire, scorer, RF010/RF011, finalize endpoint, or when the user asks to validate questionário or instrument scoring.
---

# Questionários clínicos — verificação de implementação

Valida se **coleta**, **validação**, **cálculo** e **classificação** dos cinco instrumentos do MVP estão corretos conforme protocolo clínico e arquitetura (servidor = fonte da verdade).

**Somente quando o usuário pedir** ou ao revisar código de `assessments/instruments/*`, formulários RF010 ou scorers.

## Fontes canônicas (ordem)

1. [docs/clinical-protocols/instruments/](../../../../senior-test-funcional/docs/clinical-protocols/instruments) — roteiro e pontuação
2. [docs/backend/README.md](../../../docs/backend/README.md) §5 — o que o servidor calcula
3. [docs/product/requirements.md](../../../../senior-test-funcional/docs/product/requirements.md) — RF008–RF011
4. [docs/frontend/README.md](../../../../senior-test-funcional/docs/frontend/README.md) §6 — coleta no app
5. Tabelas por instrumento: [reference.md](reference.md)

## Fluxo obrigatório

```
Task Progress:
- [ ] 1. Identificar instrumento(s) no escopo (tug | katz | berg | tinetti | meem)
- [ ] 2. Ler assess.md do protocolo + reference.md § instrumento
- [ ] 3. Mapear camadas: Zod schema → scorer → classify → persistência → UI (se houver)
- [ ] 4. Executar checklist § instrumento + checklist transversal
- [ ] 5. Rodar testes existentes; propor casos faltantes
- [ ] 6. Relatório de verificação (template abaixo)
- [ ] 7. LGPD se payload expõe dado sensível (rule lgpd-sensitive-data-review)
```

## Checklist transversal (todos os instrumentos)

| # | Regra | Falha se… |
|---|-------|-----------|
| X1 | Finalize | Score/classificação antes de `POST .../finalize` |
| X2 | Servidor | App calcula resultado oficial ou PDF diverge |
| X3 | Zod | Payload aceita item fora do domínio ou campo faltando no finalize |
| X4 | Código | `instrument_code` inconsistente (ex.: `KATZ` vs `katz`) |
| X5 | Resultado | `AssessmentResult` mutável após FINALIZED |
| X6 | Meta | `classification_meta` / `versionTag` ausente quando há tabela parametrizada |
| X7 | UI MEEM | Pontuação parcial visível durante coleta (RF) |
| X8 | Testes | Sem caso feliz + caso inválido + borda por instrumento |

## Verificação por camada

### Backend (`src/assessments/instruments/<code>/`)

- **schema (Zod):** campos, enums, min/max, `.strict()` ou equivalente
- **score():** fórmula conforme reference.md
- **classify():** faixas/cortes conforme protocolo ou `scoring-rules`
- **finalize integration:** rejeita DRAFT incompleto; persiste `schooling_band_used` (MEEM)

### Frontend (`frontend/` — quando existir)

- Coleta alinhada ao protocolo (14 Berg, 16 Tinetti, 6 Katz I/A/D, 3 TUG, blocos MEEM)
- Exibe resultado **da API** após finalize — não recalcula
- Katz: três opções nomeadas (Independente / Assistência / Dependente)

### Testes mínimos sugeridos

Por instrumento, ao menos:

1. Payload válido → score/classificação esperados
2. Item ausente → finalize rejeitado
3. Valor fora do domínio → 400
4. Caso borda documentado em [reference.md](reference.md)

## Relatório de verificação

Responder em **português**:

```markdown
# Verificação — [INSTRUMENTO] — [arquivo/RF/feature]

## Veredicto
[✅ Conforme | ⚠️ Ressalvas | ❌ Não conforme]

## Resumo
[1–2 frases]

## Conformidade por regra
| Regra | Esperado | Implementado | Status |
|-------|----------|--------------|--------|

## Divergências
| # | Severidade | Local | Problema | Correção sugerida |
|---|------------|-------|----------|-------------------|

## Testes
| Caso | Existe? | Resultado |
|------|---------|-----------|

## Pendências docs/LGPD
- …
```

Severidade: **Crítica** (resultado clínico errado) · **Alta** (validação falha) · **Média** (UX/protocolo) · **Baixa** (cosmético).

## Instrumentos — atalho

| code | Verificação principal | Protocolo |
|------|----------------------|-----------|
| `tug` | Média de 3 tempos; classificação parametrizável | [tug/assess.md](../../../../senior-test-funcional/docs/clinical-protocols/instruments/tug/assess.md) |
| `katz` | Estrato = **# Dependente** (0–6); A não entra no estrato | [katz/assess.md](../../../../senior-test-funcional/docs/clinical-protocols/instruments/katz/assess.md) |
| `berg` | Soma 14×(0–4) = 0–56; todos itens obrigatórios | [berg/assess.md](../../../../senior-test-funcional/docs/clinical-protocols/instruments/berg/assess.md) |
| `tinetti` | Subtotais 16+12=28; item 11 até 4 pts | [tinetti/assess.md](../../../../senior-test-funcional/docs/clinical-protocols/instruments/tinetti/assess.md) |
| `meem` | Total 30; corte Brucki por `schooling_band_used` | [meem/assess.md](../../../../senior-test-funcional/docs/clinical-protocols/instruments/meem/assess.md) |

Detalhes numéricos, casos borda e payloads exemplo: [reference.md](reference.md).

## Integração com code review

Se a mudança incluir auth/isolamento além do instrumento → invocar também skill **`stf-code-review`** (escopo Completa ou Segurança).

## Não fazer

- Alterar pontos de corte clínicos sem versionar `scoring-rules` e documentar
- Aprovar Katz contando Assistência no estrato
- Aprovar MEEM usando só escolaridade do cadastro quando sessão corrigiu a faixa
- Substituir validação clínica humana — skill verifica **implementação**, não conduta na cadeira
