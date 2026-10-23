# Code Review — checklist do projeto

Use as seções aplicáveis ao diff. Fontes: [backend README](../../../docs/backend/README.md), [frontend README](../../../../senior-test-funcional/docs/frontend/README.md), [requirements](../../../../senior-test-funcional/docs/product/requirements.md), [privacy-and-lgpd](../../../../senior-test-funcional/docs/product/privacy-and-lgpd.md).

---

## Segurança e LGPD

| # | Item | Falha se… |
|---|------|-----------|
| S1 | HTTPS em produção | Endpoint clínico exposto sem TLS documentado |
| S2 | Isolamento `therapist_id` | Query de paciente/avaliação sem filtro do JWT |
| S3 | Posse de recurso | `patientId` / `assessmentId` aceito sem checar dono |
| S4 | Credenciais | Senha ou token reset em log, resposta ou DB em claro |
| S5 | JWT | Token em AsyncStorage sem proteção (frontend) |
| S6 | Logs | `payload` clínico completo em INFO/DEBUG |
| S7 | PDF | Geração sem validar dono da avaliação |
| S8 | E-mail reset | Template com dados clínicos desnecessários |
| S9 | Erro produção | Stack trace exposto ao app |
| S10 | LGPD | Nova coleta de dado sensível sem declarar impacto |

---

## API e contrato

| # | Item | Falha se… |
|---|------|-----------|
| A1 | OpenAPI | Endpoint novo/alterado sem refletir no Swagger ou snapshot |
| A2 | Erros JSON | 500 retorna HTML ou shape inconsistente |
| A3 | Finalize | `AssessmentResult` criado antes de validação completa |
| A4 | DRAFT | PATCH altera avaliação FINALIZED |
| A5 | Instrumento | Um schema Zod genérico para todos os códigos |
| A6 | Timeseries | Não filtra por `patient_id` + `instrument_code` |
| A7 | RF012 | Gráfico/PDF com 1 ponto ou instrumentos misturados |
| A8 | Versionamento | Regra de corte alterada sem `versionTag` / meta |

---

## Domínio clínico (servidor)

| # | Item | Falha se… |
|---|------|-----------|
| D1 | Katz | Estrato ≠ contagem de itens **Dependente** (0–6) |
| D2 | MEEM | Corte usa só cadastro, ignora `schooling_band_used` |
| D3 | MEEM | Total ≠ soma dos blocos (máx 30) |
| D4 | Berg | Soma fora 0–56 ou item ausente no finalize |
| D5 | Tinetti | Total ≠ equilíbrio (0–16) + marcha (0–12) |
| D6 | TUG | Resultado ≠ média aritmética dos 3 tempos |
| D7 | Cliente | Scoring/classificação duplicado no app |
| D8 | PDF | Layout ou resultado diverge da API |

---

## Frontend (quando `frontend/` existir)

| # | Item | Falha se… |
|---|------|-----------|
| F1 | Thin client | Katz/MEEM/Berg calculados localmente para exibir oficial |
| F2 | MEEM | Score parcial visível durante coleta (RF) |
| F3 | API | Mock de classificação com API disponível |
| F4 | Figma | Tela inventada sem frame (rule `figma-screens-required`) |
| F5 | WCAG | Controles interativos sem label/role; alvo < 44dp |
| F6 | Wizard | Ordem instrumento → paciente → tutorial → coleta quebrada |

---

## Testes e qualidade

| # | Item | Falha se… |
|---|------|-----------|
| T1 | Auth | Sem teste fisio A ≠ paciente fisio B |
| T2 | Instrumento | Scorer sem testes unitários mínimos |
| T3 | Regressão | Mudança de corte MEEM sem teste de faixa |
| T4 | Lint/types | CI quebraria no escopo alterado |

---

## Documentação

| # | Item | Falha se… |
|---|------|-----------|
| DOC1 | RF | Comportamento novo sem atualizar `docs/product/` |
| DOC2 | Contrato | Payload diverge de `docs/backend/` §4–§5 |
| DOC3 | Protocolo | Regra clínica diverge de `clinical-protocols/` sem ADR |
