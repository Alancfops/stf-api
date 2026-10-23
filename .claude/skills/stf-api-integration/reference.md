# STF API — referência de conectividade

## GW → endpoint

| GW | Tela | Método | Rota | Hook sugerido |
|----|------|--------|------|---------------|
| GW001 | Login | POST | `/auth/login` | `useLogin` |
| GW001 | Recuperar senha | POST | `/auth/forgot-password` etc. | `useForgotPassword` |
| GW002 | Dashboard fisios | GET | `/admin/therapists` | `useTherapists` |
| GW003 | Detalhe fisio | GET | `/admin/therapists/:id` | `useTherapist` |
| GW006 | Excluir fisio | DELETE | `/admin/therapists/:id` | `useDeleteTherapist` |
| GW007 | Perfil paciente | GET | `/admin/patients/:id` | `usePatient` |
| GW007 | Detalhe avaliação | GET | `/admin/patients/:id/assessments/:assessmentId` | `useAssessment` |
| GW008 | Histórico | GET | `/admin/patients/:id/assessments` | `usePatientAssessments` |
| GW008 | Gráfico | GET | `/admin/patients/:id/instruments/:code/timeseries` | `useTimeseries` |
| GW004 | Excluir paciente | DELETE | `/admin/patients/:id` | `useDeletePatient` |
| GW005 | Transferir | POST | `/admin/patients/:id/transfer` | `useTransferPatient` |
| GW009 | PDF | POST | `/admin/reports/assessments/:assessmentId` | `useDownloadReport` |
| GW010 | Audit log | GET | `/admin/audit-logs` | `useAuditLogs` |

## Query params comuns

### GET `/admin/therapists`

`search`, `page`, `limit` (max 100), `sortBy` (`fullName`|`email`|`createdAt`), `sortOrder`

### GET `/admin/patients/:id/assessments`

`status` (`DRAFT`|`FINALIZED`), `instrumentCode`

### GET `/admin/audit-logs`

`action`, `adminId`, `from`, `to`, `page`, `limit`

## Respostas paginadas

Shape padrão:

```json
{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }
```

## Hook exemplo — lista (GW002)

```typescript
// features/therapists/useTherapists.ts
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export function useTherapists(params?: TherapistsQuery) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: ['admin', 'therapists', params],
    queryFn: () => apiRequest<TherapistsResponse>(`/admin/therapists?${qs}`),
  });
}
```

## Hook exemplo — mutação destrutiva (GW004)

```typescript
export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) =>
      apiRequest<void>(`/admin/patients/${patientId}`, { method: 'DELETE' }),
    onSuccess: (_, patientId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'patients', patientId] });
      qc.invalidateQueries({ queryKey: ['admin', 'therapists'] });
    },
  });
}
```

## Interceptor 401 (global)

```typescript
// lib/api/errors.ts
export async function toApiError(res: Response): Promise<Error> {
  if (res.status === 401) {
    clearAccessToken();
    window.location.assign('/login');
  }
  let message = 'Something went wrong. Try again.';
  try {
    const body = await res.json();
    if (typeof body.message === 'string') message = body.message;
  } catch { /* ignore */ }
  return new Error(message);
}
```

Mensagens 409 da API (exibir ao usuário):

- Fisio com pacientes: `"Este fisioterapeuta ainda possui N paciente(s)..."`
- Único admin: `"Não é possível remover o único administrador do sistema."`

## Protected routes (React Router)

```typescript
// lib/auth/requireAdmin.tsx
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = getAccessToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
```

Role já validada no login; 403 em runtime cobre revogação de admin.

## MSW / testes

Mock handlers por rota — fixtures **anonimizadas**:

```typescript
http.get('*/admin/therapists', () =>
  HttpResponse.json({ data: [{ id: '...', fullName: 'Test Therapist', ... }], meta: {...} })
);
```

Nunca usar payloads clínicos reais em fixtures commitadas.

## Rotas fora do escopo admin

| Rota | Motivo |
|------|--------|
| `POST /auth/register` | Admin não se registra pelo painel |
| `GET/POST /patients` (sem `/admin`) | Ownership fisio — mobile |
| `POST /assessments/*/finalize` | Admin não aplica testes |

## Troubleshooting

| Sintoma | Causa provável |
|---------|----------------|
| CORS error | `CORS_ORIGINS` no STF sem origem do Vite |
| 403 em `/admin/*` | Token de THERAPIST ou role revogada |
| Network failed | STF backend down ou URL errada em `.env` |
| PDF corrompido | Tratou response como JSON em vez de blob |
| Empty após F5 | Token ok — verificar query refetch, não re-login |

## Verificação rápida (curl)

```bash
# Login
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@clinica.exemplo","password":"Admin1234"}'

# Lista (substituir TOKEN)
curl -s http://localhost:3000/admin/therapists \
  -H "Authorization: Bearer TOKEN"
```
