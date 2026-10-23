# Referência — arquitetura e testes

## Estrutura de pastas sugerida

```
src/
├── pages/                 # rotas React Router (GW001–GW010)
├── components/
│   ├── ui/                # primitivos (Button, Modal, Table)
│   └── layout/            # AppShell, Sidebar
├── features/
│   ├── auth/
│   │   ├── useLogin.ts
│   │   └── loginSchema.ts
│   ├── therapists/
│   │   ├── useTherapists.ts
│   │   └── useDeleteTherapist.ts
│   └── patients/
│       ├── usePatient.ts
│       └── useTransferPatient.ts
├── lib/
│   ├── api/
│   │   ├── client.ts      # fetch/ky + interceptor Bearer
│   │   └── errors.ts      # mapHttpError → mensagem segura
│   └── auth/
│       ├── session.ts      # get/set/clear token
│       └── requireAdmin.ts
├── types/
│   └── api.d.ts           # gerado openapi-typescript
└── test/
    ├── setup.ts
    └── mocks/             # handlers MSW (opcional)
```

## Regras de dependência

```
pages → features → lib → types
components → (props only; hooks via pages/features)
```

- `lib/api` não importa de `pages/` ou `components/`
- Scoring, interpretação clínica e PDF institucional ficam na **API STF** — o front só consome

## Cliente HTTP

```typescript
// lib/api/client.ts — padrão
export async function apiGet<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${import.meta.env.VITE_STF_API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw await toApiError(res); // sem vazar body clínico
  return res.json() as Promise<T>;
}
```

## TanStack Query — convenções

- `queryKey` por recurso: `['therapists']`, `['patient', id]`
- Mutações destrutivas: `onSuccess` invalida queries relacionadas
- `staleTime` moderado; **não** persistir cache sensível no MVP
- Logout: `queryClient.clear()`

## Formulários (RHF + Zod)

- Schema Zod em `features/*/schema.ts` — reutilizável no teste
- Erros de campo inline; erro de API via toast ou banner genérico
- Login: rejeitar `user.role !== 'ADMIN'` antes de navegar

## Testes — exemplos

### Hook com Vitest

```typescript
// features/auth/loginSchema.test.ts
import { loginSchema } from './loginSchema';

it('rejeita email inválido', () => {
  expect(loginSchema.safeParse({ email: 'x', password: '12345678' }).success).toBe(false);
});
```

### Componente com RTL

```typescript
// components/ConfirmDeleteModal.test.tsx
it('exige confirmação antes de chamar onConfirm', async () => {
  const onConfirm = vi.fn();
  render(<ConfirmDeleteModal open title="Excluir?" onConfirm={onConfirm} />);
  await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
  expect(onConfirm).toHaveBeenCalledOnce();
});
```

### E2E Playwright (fluxos críticos)

1. Login admin válido → dashboard
2. Login therapist → mensagem de acesso negado
3. Excluir paciente → modal → cancelar não muta
4. Transferir paciente → confirma → lista atualiza

Fixtures E2E: emails fictícios; **nunca** dados clínicos reais.

## Code review — severidade

Ao reportar problemas:

- **Crítico:** vazamento LGPD, auth bypass, mutação sem confirmação, `any` em payload clínico
- **Importante:** violação de camada, sem teste em fluxo destrutivo, estados de tela faltando
- **Sugestão:** naming, extrair hook, simplificar componente

## Checklist LGPD por PR

- [ ] Dados exibidos são mínimos para a tarefa admin
- [ ] Confirmação em excluir/transferir (GW004–GW006)
- [ ] PDF não persiste localmente
- [ ] Logs/analytics sem PII ou dados de saúde
- [ ] Fixtures e mocks anonimizados
- [ ] Erro HTTP 4xx/5xx: mensagem genérica na UI

## Anti-patterns

| Evitar | Preferir |
|--------|----------|
| `fetch` dentro de componente | `useQuery` + `apiGet` |
| Regra clínica no front | Consumir API |
| `localStorage` para JWT | `sessionStorage` |
| `console.log(patient)` | Remover ou mock em teste |
| Componente 300+ linhas | Page + hooks + subcomponentes |
| Teste que só snapshot | Assert comportamento e acessibilidade |
