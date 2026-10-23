---
description: Backend é fonte da verdade — scoring no finalize, isolamento therapist_id, OpenAPI, Zod por instrumento. Aplica ao implementar ou documentar API, Prisma, contratos ou domínio clínico no servidor.
---

# Backend — autoridade do servidor

A API NestJS é a **única fonte da verdade** para regras de negócio, persistência oficial, permissões, PDF e e-mail transacional.

Referências: [docs/backend/README.md](../backend/README.md) · [docs/engineering/architecture.md](../../../senior-test-funcional/docs/engineering/architecture.md) · [docs/engineering/data-model.md](../engineering/data-model.md).

## Princípios não negociáveis

| # | Regra | Implicação |
|---|-------|------------|
| 1 | **Autorização no servidor** | `therapistId` do JWT em toda query de paciente/avaliação/PDF |
| 2 | **Não confiar no cliente** | Validar posse do recurso antes de ler/escrever |
| 3 | **Scoring no finalize** | `AssessmentResult` só após `POST .../finalize` válido |
| 4 | **Um motor por instrumento** | Pastas `tug`, `katz`, `berg`, `tinetti`, `meem` — sem `if` genérico espalhado |
| 5 | **Zod por `instrument_code`** | Payload distinto por instrumento; rejeitar opaco |
| 6 | **Contrato antes do app** | Mudou JSON/regra → OpenAPI (+ snapshot em release) |
| 7 | **PDF e e-mail só aqui** | App não gera PDF institucional nem envia SMTP |

## Domínio clínico (servidor)

| Instrumento | Cálculo oficial |
|-------------|-----------------|
| TUG | Média aritmética de 3 tempos (s) |
| Katz | Estrato 0–6 = contagem de **Dependente** (A não entra) |
| Berg | Soma 14×(0–4), máx 56 |
| Tinetti | Soma equilíbrio (16) + marcha (12) |
| MEEM | Soma 30 + corte Brucki por `schooling_band_used` da **sessão** |

Verificação detalhada: skill **`clinical-instrument-scoring`**.

## Antes de concluir alteração de backend

1. **LGPD** — rule `lgpd-sensitive-data-review` se dado pessoal/sensível.
2. **Isolamento** — cenário fisio A + paciente fisio B deve falhar (403/404).
3. **OpenAPI** — endpoint/schema novo refletido no Swagger.
4. **Testes** — scorer unitário + auth scope mínimo.
5. **Docs** — `docs/backend/`, `data-model.md` ou `requirements.md` se comportamento mudou.

## Limite

`docs/backend/` descreve **comportamento**, não tutorial de código. Implementação: rule **`backend-nestjs-implementation`** + agent **`senior-test-backend`** quando existir pasta `backend/`.
