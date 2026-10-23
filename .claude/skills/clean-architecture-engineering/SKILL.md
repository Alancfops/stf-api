---
name: clean-architecture-engineering
description: Aplica arquitetura limpa, testes e clean code no gerenciador admin STF (Vite + React + TS), com code review consistente e conformidade LGPD. Use ao implementar features, refatorar, escrever testes, revisar código ou quando o usuário mencionar arquitetura, qualidade, testes ou direitos do titular.
---

# Engenharia — arquitetura limpa, testes e LGPD

Cliente web admin do STF. API é fonte da verdade — **não duplicar domínio clínico** no browser.

## Base de trabalho

### Rules — ler e aplicar

| Rule | Escopo nesta skill |
|------|-------------------|
| `../stf-gerenciador-web/docs/rules/code-review-clean-code.md` | **Obrigatória** — review antes de concluir/commit |
| `../stf-gerenciador-web/docs/rules/lgpd-admin-panel.md` | **Obrigatória** — dados sensíveis, auth, logs, confirmações |
| `../stf-gerenciador-web/docs/rules/stf-readonly-consumer.md` | Fronteira do lado do cliente (o gerenciador não edita a API) |
| `../stf-gerenciador-web/docs/rules/stf-design-tokens.md` | Ao tocar UI — tokens, não hex soltos |

### Documentação

| Doc | Uso |
|-----|-----|
| `../stf-gerenciador-web/docs/engineering/architecture.md` | Camadas, princípios, fases |
| `../stf-gerenciador-web/docs/engineering/stack.md` | Stack oficial, testes, sessionStorage |
| `../stf-gerenciador-web/docs/contracts/admin-api.md` | Contratos HTTP — fonte da verdade |
| `../stf-gerenciador-web/docs/product/features.md` | GW001–GW010 |
| `../stf-gerenciador-web/docs/domain/business-rules.md` | RB-07 audit, RB-08 LGPD admin |

### Skills relacionadas

| Skill | Quando acionar |
|-------|----------------|
| `stf-api-integration` | Hooks, cliente HTTP, TanStack Query |
| `admin-ui-ux` | Componentes, layout, WCAG, responsividade |
| `git-workflow` | Branch, commit, PR (só se o usuário pedir) |

## Camadas (frontend)

Respeitar dependência unidirecional — camadas internas não importam UI:

```
pages/          → composição de telas (GW)
components/     → UI reutilizável, sem fetch direto
features/       → hooks + casos de uso por domínio (therapists, patients)
lib/api/        → cliente HTTP tipado (OpenAPI)
lib/auth/       → sessionStorage, guards de role
types/          → tipos gerados + helpers
```

| Camada | Pode | Não pode |
|--------|------|----------|
| **pages** | Orquestrar hooks, layout, rotas | Lógica HTTP inline, `fetch` solto |
| **features** | TanStack Query, RHF+Zod, mappers | JSX pesado, cores hardcoded |
| **lib/api** | Bearer, erros HTTP, tipos API | Estado React, regras de negócio clínica |
| **components** | Props tipadas, estados visuais | Acessar `sessionStorage` direto |

Detalhes de pastas e exemplos: [reference.md](reference.md)

## Princípios de código limpo

- **Escopo mínimo:** só o necessário; sem refatoração oportunista
- **Convenções existentes:** nomes, pastas e padrões do arquivo tocado
- **Tipos:** OpenAPI/`openapi-typescript` — evitar `any`
- **Estado:** TanStack Query para servidor; sem global state desnecessário
- **Erros:** loading / empty / error em toda tela; mensagem clara ao usuário
- **Funções pequenas:** uma responsabilidade; extrair hook quando lógica cresce

## LGPD — pensar no titular

Dados de **pacientes idosos** e avaliações clínicas — tratar com mínimo necessário:

- Exibir só o necessário à supervisão (RB-08); sem export em massa no MVP
- JWT em `sessionStorage`; logout limpa token + cache Query
- Ações destrutivas: confirmação explícita; consequência visível
- PDF: blob transitório — não persistir em disco/localStorage/indexedDB
- Erros genéricos ao usuário — sem stack trace ou payload clínico
- **Nunca** logar: token, senha, `Assessment.payload`, PDF base64, resultados clínicos

## Testes (stack oficial)

| Tipo | Ferramenta | Quando |
|------|------------|--------|
| Unit / hook | Vitest | Mappers, validação Zod, auth helpers |
| Componente | Vitest + RTL | Form login, modais de confirmação, estados empty/error |
| E2E | Playwright | Login admin, exclusão com confirmação, transferência |

Prioridade: fluxos destrutivos, auth/role guard, integração API mockada.

## Workflow por feature

```
- [ ] 1. Ler GW em docs/product/features.md + endpoint em admin-api.md
- [ ] 2. Definir camada (hook em features/, page fina)
- [ ] 3. Implementar com tipos API + estados de tela
- [ ] 4. LGPD: confirmações, sem logs sensíveis
- [ ] 5. Testes no comportamento crítico
- [ ] 6. Code review (checklist abaixo)
```

## Code review antes de concluir

- [ ] Sem `console.log`, TODO soltos ou código morto comentado
- [ ] Sem secrets ou `.env` no diff
- [ ] Lint/typecheck nos arquivos alterados
- [ ] Comportamento alinhado à spec GW
- [ ] Dependências respeitam camadas (UI → features → lib)
- [ ] Testes cobrem caminho feliz + erro relevante
- [ ] LGPD: nenhum dado sensível em logs/fixtures
- [ ] Não criou `.md` novo sem pedido do usuário

## Exemplo rápido

```typescript
// ❌ Page com fetch e any
export function TherapistsPage() {
  const [data, setData] = useState<any>();
  useEffect(() => { fetch('/admin/therapists').then(r => r.json()).then(setData); }, []);
}

// ✅ Page fina + hook tipado
export function TherapistsPage() {
  const { data, isLoading, error } = useTherapists();
  if (isLoading) return <TherapistsSkeleton />;
  if (error) return <ErrorState message="Não foi possível carregar os fisioterapeutas." />;
  if (!data?.length) return <EmptyState label="Nenhum fisioterapeuta" />;
  return <TherapistsTable items={data} />;
}
```

## Skills relacionadas

- UI/responsividade/WCAG: `.claude/skills/admin-ui-ux/SKILL.md`
- API/hooks: `.claude/skills/stf-api-integration/SKILL.md`
- Git: `.claude/skills/git-workflow/SKILL.md`
