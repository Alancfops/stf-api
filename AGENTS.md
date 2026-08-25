# Backend — Guia para agentes

API **NestJS** do Sênior Teste Funcional. Entrada global do monorepo: [../AGENTS.md](../AGENTS.md).

## Fontes canônicas

| Prioridade | Documento |
|------------|-----------|
| 1 | [docs/product/requirements.md](../docs/product/requirements.md) — RFs RF001–RF013 |
| 2 | [docs/backend/README.md](../docs/backend/README.md) — endpoints, scoring, módulos |
| 3 | [docs/engineering/data-model.md](../docs/engineering/data-model.md) — ER, Prisma |
| 4 | [docs/product/privacy-and-lgpd.md](../docs/product/privacy-and-lgpd.md) — dados sensíveis |

## Stack

Node.js LTS · NestJS · TypeScript · Prisma · PostgreSQL · Zod · JWT · Swagger/OpenAPI

## Rules obrigatórias

- [backend-server-authority](../.cursor/rules/backend-server-authority.mdc) — scoring no finalize, isolamento `therapist_id`
- [backend-nestjs-implementation](../.cursor/rules/backend-nestjs-implementation.mdc) — módulos, guards, scorers
- [lgpd-sensitive-data-review](../.cursor/rules/lgpd-sensitive-data-review.mdc) — revisão LGPD em dados pessoais/sensíveis

## Subagent recomendado

[senior-test-backend](../.cursor/agents/senior-test-backend.md) — use ao implementar ou revisar `backend/`, Prisma, contratos HTTP ou instrumentos clínicos.

## Estrutura de módulos (`backend/src/`)

```
auth/           RF001–RF003
therapists/     perfil do profissional autenticado
patients/       RF004–RF006
instruments/    RF007 catálogo
assessments/    RF008–RF012 + instruments/{tug,katz,berg,tinetti,meem}/
reports/        RF013 PDF
admin/          painel admin (papel ADMIN, audit log)
health/         healthcheck
```

Cada instrumento tem pasta própria com `schema.zod.ts`, `score()` e `classify()` — **sem** `if` genérico espalhado.

## Antes de concluir alteração

1. **LGPD** — se envolver dado pessoal/sensível.
2. **Isolamento** — fisio A não acessa paciente do fisio B (403/404).
3. **OpenAPI** — endpoint/schema novo refletido no Swagger.
4. **Testes** — scorer unitário + auth scope mínimo.
5. **Instrumentos** — skill [clinical-instrument-scoring](../.cursor/skills/clinical-instrument-scoring/SKILL.md).

## Comandos úteis

```bash
make setup && make migrate   # primeira vez
make start                   # Postgres + API :3000 + Expo
cd backend && npm run test   # testes unitários/e2e
```
