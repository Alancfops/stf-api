# Backend — Sênior Teste Funcional

API **NestJS + Prisma + PostgreSQL** do projeto Sênior Teste Funcional.

## Início rápido

Na **raiz do monorepo** (recomendado):

```bash
make setup      # primeira vez: deps, .env, Postgres
make migrate    # migrations Prisma
make start      # Postgres + API + Expo
```

Só a API (watch):

```bash
make start-backend
```

Swagger (dev): [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Configuração

Copie ou revise `backend/.env` (gerado por `make setup` a partir de `.env.example`):

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL (Docker: `senior:senior@localhost:5432/senior_test`) |
| `JWT_ACCESS_SECRET` | Segredo JWT — `make secrets` na raiz |
| `MAIL_PROVIDER` | `gmail`, `console` (código no terminal) ou `resend` |

Verifique e-mail RF003: `make mail-check` (na raiz).

## Scripts npm (nesta pasta)

| Comando | Descrição |
|---------|-----------|
| `npm run start:dev` | API em watch |
| `npm run test` | Testes unitários |
| `npm run test:e2e` | Testes e2e (banco `senior_test_e2e`) |
| `npm run lint` | ESLint |

## Documentação

| Tema | Onde |
|------|------|
| Comportamento da API (RFs) | [docs/backend/README.md](../docs/backend/README.md) |
| Instalação completa + Makefile | [README.md](../README.md) na raiz |
| Modelo de dados | [docs/engineering/data-model.md](../docs/engineering/data-model.md) |
| LGPD | [docs/product/privacy-and-lgpd.md](../docs/product/privacy-and-lgpd.md) |
