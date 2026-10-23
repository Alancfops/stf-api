---
description: Padrões de implementação NestJS do Senior Teste Funcional — módulos, Prisma, guards, scorers testáveis, OpenAPI. Aplica ao editar código em backend/ ou packages/shared-contracts/.
---

# Backend NestJS — implementação

Stack: **Node.js LTS + NestJS + TypeScript + Prisma + PostgreSQL + Zod + JWT + Swagger**.

Estrutura alvo ([docs/backend/README.md §9](../backend/README.md), [architecture.md §6](../../../senior-test-funcional/docs/engineering/architecture.md)):

```
src/
├── prisma/
├── health/
├── auth/              # RF001–RF003
├── therapists/        # perfil do profissional autenticado
├── patients/          # RF004–RF006
├── instruments/       # RF007 catálogo
├── assessments/
│   ├── assessments.controller.ts
│   ├── assessments.service.ts
│   └── instruments/
│       ├── tug/       # schema.zod.ts + score() + classify()
│       ├── katz/
│       ├── berg/
│       ├── tinetti/
│       └── meem/
├── scoring-rules/
├── reports/           # RF013 PDF
└── notifications/     # RF003 e-mail
```

## Convenções de código

| Tema | Padrão |
|------|--------|
| `instrument_code` (API/DB) | **MAIÚSCULAS**: `TUG`, `KATZ`, `BERG`, `TINETTI`, `MEEM` |
| Pastas / URL path | **minúsculas**: `tug`, `katz`, … |
| Auth | Guard JWT global; `@CurrentTherapist()` ou equivalente |
| Pacientes | `WHERE therapist_id = :therapistId` em toda query |
| Avaliação | `DRAFT` → PATCH parcial; `FINALIZED` imutável |
| Erros | JSON `{ statusCode, message, details? }` — nunca HTML em produção |
| Senha | Argon2id preferível; reset token hasheado, TTL 10 min, uso único |
| Logs | Não logar `payload` clínico completo em INFO |

## Por instrumento (`assessments/instruments/*/`)

Cada pasta contém:

- **schema** — Zod strict, domínios válidos por item
- **score(payload)** — número bruto oficial
- **classify(raw, meta?)** — rótulo/faixa; usa `scoring-rules` quando parametrizado
- **\*.spec.ts** — casos feliz, inválido e borda (ver skill `clinical-instrument-scoring`)

## Entrega por fase

| Fase | Escopo | Critério |
|------|--------|----------|
| **A** | Auth + patients + Prisma + OpenAPI | RF001–RF005 via HTTP sem app |
| **B** | 5 instrumentos + timeseries + PDF | RF007–RF013; ordem: TUG → Katz → Berg → Tinetti → MEEM |

Branch: `feature/backend-*` a partir de `develop`. Commits: skill `conventional-commits`.

## Antes de merge

- Skill **`stf-code-review`** (Completa ou Segurança em auth/patients/assessments)
- Skill **`clinical-instrument-scoring`** se tocou instrumento
- Prisma schema alinhado a [data-model.md](../engineering/data-model.md)

## Proibido

- Scoring ou classificação MEEM/Katz no app “para preview”
- `patientId` sem checagem de posse
- GraphQL no MVP
- Microsserviços antes de dor real de escala
- PDF gerado no cliente
