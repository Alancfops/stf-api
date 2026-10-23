# Code Review — exemplos

## Pedidos do usuário

```
Revisa o que fiz na branch feature/backend-auth
```

```
Code review das mudanças locais (uncommitted)
```

```
Review de segurança antes do merge do RF004
```

## Escopo automático sugerido

| Arquivos no diff | Escopo |
|------------------|--------|
| `src/auth/**` | Completa |
| `src/assessments/instruments/meem/**` | Completa + skill `clinical-instrument-scoring` |
| `docs/backend/README.md` só | Bugs / lógica (checklist DOC*) |
| `.claude/skills/**` | Bugs / lógica |

## Exemplo de bloqueador

```markdown
## Bloqueadores
- ❌ `patients.service.ts:42` — GET /patients/:id não filtra `therapist_id` do JWT (S2, S3)
- ❌ `katz.scorer.ts:18` — estrato soma I+A+D em vez de contar só Dependente (D1)
```
