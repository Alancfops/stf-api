# CLAUDE.md — STF API (NestJS)

API **NestJS** do Sênior Teste Funcional — única fonte da verdade para o app mobile e o gerenciador web.

Este repositório foi extraído de `senior-test-funcional/backend/` (histórico Git preservado). Os clientes ficam em repositórios irmãos:

| Repositório | Caminho local | Papel |
|-------------|---------------|-------|
| **stf-api** | este repo | API NestJS, Prisma, PostgreSQL (Docker), PDF, e-mail |
| **senior-test-funcional** | `../senior-test-funcional` | App Expo + especificação de produto (`docs/product/`) |
| **stf-gerenciador-web** | `../stf-gerenciador-web` | Painel admin web — consome `/auth/*` e `/admin/*` |

Mudança de contrato HTTP afeta os dois clientes: atualize `docs/backend/README.md` (app) e `../stf-gerenciador-web/docs/contracts/admin-api.md` (admin).

## Fontes canônicas

| Prioridade | Documento |
|------------|-----------|
| 1 | [requirements.md](../senior-test-funcional/docs/product/requirements.md) — RFs RF001–RF013 (repo do app) |
| 2 | [docs/backend/README.md](docs/backend/README.md) — endpoints, scoring, módulos |
| 3 | [docs/engineering/data-model.md](docs/engineering/data-model.md) — ER, Prisma |
| 4 | [privacy-and-lgpd.md](../senior-test-funcional/docs/product/privacy-and-lgpd.md) — dados sensíveis (repo do app) |
| 5 | [admin-api.md](../stf-gerenciador-web/docs/contracts/admin-api.md) — contrato `/admin/*` (repo do gerenciador) |

## Stack

Node.js LTS · NestJS · TypeScript · Prisma · PostgreSQL · Zod · JWT · Swagger/OpenAPI

## Regras sempre válidas (`docs/rules/`)

@docs/rules/backend-server-authority.md
@docs/rules/backend-nestjs-implementation.md
@docs/rules/lgpd-sensitive-data-review.md

## Estrutura de módulos (`src/`)

```
auth/           RF001–RF003
therapists/     perfil do profissional autenticado
patients/       RF004–RF006
instruments/    RF007 catálogo
assessments/    RF008–RF012 + instruments/{tug,katz,berg,tinetti,meem}/
reports/        RF013 PDF
admin/          painel admin (ADMIN/ASSISTANT, audit log)
health/         healthcheck
```

Cada instrumento tem pasta própria com `schema.zod.ts`, `score()` e `classify()` — **sem** `if` genérico espalhado.

## Agents, skills e commands (`.claude/`)

| Tipo | Item | Quando |
|------|------|--------|
| Agent | [senior-test-backend](.claude/agents/senior-test-backend.md) | API do app — Prisma, scoring, OpenAPI, RF001–RF013 |
| Agent | [stf-backend-senior](.claude/agents/stf-backend-senior.md) | `AdminModule` e `/admin/*` do gerenciador web |
| Skill | [clinical-instrument-scoring](.claude/skills/clinical-instrument-scoring/SKILL.md) | Verificar TUG, Katz, Berg, Tinetti, MEEM |
| Skill | [clean-architecture-engineering](.claude/skills/clean-architecture-engineering/SKILL.md) | Camadas, testes, LGPD |
| Skill | [stf-api-integration](.claude/skills/stf-api-integration/SKILL.md) | Contrato GW↔endpoint consumido pelo gerenciador |
| Skill | [stf-code-review](.claude/skills/stf-code-review/SKILL.md) | `/code-review` + `/security-review` + checklist do projeto |
| Skill | [conventional-commits](.claude/skills/conventional-commits/SKILL.md) | Commits em inglês — `type(scope): subject` |
| Skill | [git-branching](.claude/skills/git-branching/SKILL.md) | Branches — `develop`, `feature/`, `hotfix/` |
| Command | `/stf-code-review`, `/verify-instruments` | [.claude/commands/](.claude/commands/) |

## Antes de concluir alteração

1. **LGPD** — se envolver dado pessoal/sensível.
2. **Isolamento** — fisio A não acessa paciente do fisio B (403/404).
3. **OpenAPI** — endpoint/schema novo refletido no Swagger.
4. **Testes** — scorer unitário + auth scope mínimo; e2e em `test/`.
5. **Instrumentos** — skill `clinical-instrument-scoring`.
6. **Banco** — exclusões de dados reais só com confirmação explícita do usuário.

**Não commite** salvo pedido explícito; **não inclua** segredos (`.env`, tokens).

## Comandos úteis

```bash
make setup && make migrate   # primeira vez: deps, .env, Postgres, migrations
make start                   # Postgres + API :3000 (watch)
npm run test                 # unitários
make test                    # unitários + e2e (banco senior_test_e2e)
```
