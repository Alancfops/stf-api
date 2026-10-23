---
name: stf-api-integration
description: Connects the STF admin web client to the NestJS API — auth JWT, typed HTTP client, TanStack Query hooks, GW001–GW010 endpoints, CORS, PDF blob, and safe error handling. Use when implementing API calls, hooks, login, admin routes, openapi-typescript, VITE_STF_API_URL, or consuming /admin/* and /auth/*.
---

# STF API Integration

Como o gerenciador web (`../stf-gerenciador-web`) consome esta API. Use ao alterar `/auth/*` ou `/admin/*` para manter servidor e cliente alinhados.

## Base de trabalho

### Rules — ler e aplicar

| Rule | Escopo nesta skill |
|------|-------------------|
| `../stf-gerenciador-web/docs/rules/stf-readonly-consumer.md` | **Obrigatória** — STF read-only; não editar backend |
| `../stf-gerenciador-web/docs/rules/lgpd-admin-panel.md` | **Obrigatória** — JWT sessionStorage, sem logs clínicos, PDF blob |
| `../stf-gerenciador-web/docs/rules/code-review-clean-code.md` | Tipos, erros, TanStack Query, sem `any` |
| `../stf-gerenciador-web/docs/rules/stf-design-tokens.md` | Indireta — erros/mensagens na UI seguem tokens |

### Documentação

| Doc | Uso |
|-----|-----|
| `../stf-gerenciador-web/docs/contracts/admin-api.md` | Request/response — **fonte canônica** |
| `../stf-gerenciador-web/docs/engineering/integration-with-stf.md` | Dev setup, CORS, seed, fluxos |
| `../stf-gerenciador-web/docs/engineering/stack.md` | fetch/ky, openapi-typescript, env |
| `../stf-gerenciador-web/docs/product/features.md` | GW ↔ telas |
| `.env.example` | `VITE_STF_API_URL` |

Mapa GW → endpoint: [reference.md](reference.md)

### Skills relacionadas

| Skill | Quando acionar |
|-------|----------------|
| `clean-architecture-engineering` | Camadas lib/features, testes de hooks |
| `admin-ui-ux` | Estados loading/error na UI, modais confirmação |
| `git-workflow` | Commit/PR de integração (só se o usuário pedir) |

## Ambiente local

```bash
# API (Terminal 1) — este repo
make migrate && npx prisma db seed && make start

# Gerenciador (Terminal 2)
cd ../stf-gerenciador-web
cp .env.example .env   # VITE_STF_API_URL=http://localhost:3000
```

| Check | Valor |
|-------|-------|
| API | `http://localhost:3000/health` |
| Swagger | `http://localhost:3000/api/docs` (tag `admin`) |
| CORS no STF | `CORS_ORIGINS=http://localhost:5173` |
| Conta admin | `cd backend && npm run admin:set -- --email <email> --name "<nome>"` |

Produção: `VITE_STF_API_URL` com **HTTPS** apenas.

## Arquitetura de conectividade

```
pages → features/*/use*.ts → lib/api/client.ts → STF API
                ↓
         TanStack Query (cache/refetch)
                ↓
         lib/auth/session.ts (Bearer)
```

- **Um** cliente HTTP em `lib/api/` — sem `fetch` espalhado
- Tipos via `openapi-typescript` a partir de `/api/docs-json`
- Hooks por domínio em `features/` — pages só consomem hooks

## Cliente HTTP

```typescript
// lib/api/client.ts — padrão
const baseUrl = import.meta.env.VITE_STF_API_URL;

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

Gerar tipos:

```bash
npx openapi-typescript http://localhost:3000/api/docs-json -o src/types/api.d.ts
```

## Auth (GW001)

| Passo | Ação |
|-------|------|
| Login | `POST /auth/login` `{ email, password }` |
| Validação | Se `user.role !== 'ADMIN'` → erro UI; **não** salvar token |
| Sucesso | `sessionStorage.setItem('accessToken', accessToken)` |
| Requests | Header `Authorization: Bearer <token>` |
| 401 | Limpar token + redirect `/login` |
| 403 | `"Acesso restrito a administradores."` |
| Logout | Clear sessionStorage + `queryClient.clear()` |

Recuperação senha: `POST /auth/forgot-password`, `/verify-reset-code`, `/reset-password` (RF003).

## TanStack Query — convenções

| Operação | Padrão |
|----------|--------|
| Lista fisios | `queryKey: ['admin','therapists', params]` |
| Detalhe fisio | `['admin','therapists', id]` |
| Paciente | `['admin','patients', id]` |
| Avaliações | `['admin','patients', id, 'assessments']` |
| Timeseries | `['admin','patients', id, 'timeseries', code]` |
| DELETE/POST mutação | `useMutation` + `invalidateQueries` |
| Destrutivas | Confirmação UI **antes** da mutação |

**Não** persistir cache Query com dados clínicos no MVP.

## Erros HTTP → UI

| Status | Tratamento |
|--------|------------|
| `401` | Sessão expirada → login |
| `403` | Acesso negado (não admin) |
| `404` | Recurso não encontrado |
| `409` | Conflito de negócio — exibir `message` da API (ex.: fisio com pacientes) |
| `400` | Validação — exibir `message` |
| 5xx | Mensagem genérica — **sem** logar body clínico |

```typescript
// ❌ console.log(await res.json())
// ✅ throw toApiError(res) → mensagem segura na UI
```

## Casos especiais

### PDF (GW009)

`POST /admin/reports/assessments/:assessmentId` → resposta **binária**, não JSON.

```typescript
const res = await fetch(`${baseUrl}/admin/reports/assessments/${id}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
// download transitório — revokeObjectURL após uso; não persistir
```

### Transfer (GW005)

`POST /admin/patients/:id/transfer` body: `{ targetTherapistId: uuid }`

### Avatar URLs

`avatarUrl` pode ser path relativo — prefixar com `VITE_STF_API_URL` se necessário.

## Workflow por GW

```
- [ ] 1. Ler seção em admin-api.md + GW em features.md
- [ ] 2. Adicionar função em lib/api/ ou hook em features/
- [ ] 3. useQuery/useMutation + estados loading/empty/error
- [ ] 4. Mutação destrutiva → modal confirmação (LGPD)
- [ ] 5. Teste: mock fetch ou MSW — sem dados clínicos reais
```

## O que NÃO consumir

Rotas `/patients/*`, `/assessments/*` do **fisio comum** — admin usa apenas `/admin/*` + `/auth/*`.

Não reimplementar scoring, finalize ou interpretação clínica no browser.

## Checklist

- [ ] Endpoint conferido em `admin-api.md`
- [ ] Bearer via cliente centralizado
- [ ] Tipos alinhados ao OpenAPI
- [ ] 401/403 tratados globalmente
- [ ] Mutações destrutivas com confirmação
- [ ] PDF via blob, sem persistência local
- [ ] Sem logs de payload clínico ou token
