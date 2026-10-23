# Exemplos — git-branching

## Nova tela de login (RF002)

**Usuário:** “Vou implementar login, abre branch.”

```bash
rtk git fetch origin
rtk git checkout develop
rtk git pull origin develop
rtk git checkout -b feature/mobile-login-rf002
```

Commits na branch: `feat(frontend): implement login screen from Figma`

PR → `develop`.

---

## Endpoint de pacientes (RF004)

```bash
rtk git checkout -b feature/backend-patient-crud-rf004
```

Commits: `feat(patients): add create patient endpoint with therapist scope`

---

## Atualizar documentação OpenAPI

```bash
rtk git checkout -b docs/openapi-auth-snapshot
```

Commits: `docs(contracts): add OpenAPI snapshot for auth routes`

---

## Hotfix PDF em produção

```bash
rtk git checkout main
rtk git pull origin main
rtk git checkout -b hotfix/pdf-stream-timeout
```

Commits: `fix(pdf): increase report generation timeout`

Merge → `main`, depois integrar em `develop`.

---

## Skills do Claude Code (chore)

```bash
rtk git checkout -b chore/claude-git-branching-skill
```

Commits: `chore(claude): add git-branching workflow skill`

---

## Bug em develop (não urgente)

```bash
rtk git checkout -b fix/frontend-patient-search-debounce
```

Commits: `fix(frontend): debounce patient list search input`

---

## Nomes ruins → bons

| Evitar | Preferir |
|--------|----------|
| `feature/nova-tela` | `feature/mobile-register-rf001` |
| `fix/bug` | `fix/auth-token-expiry-handling` |
| `feature/wip` | `feature/assessments-finalize-rf011` |
| `docs/update` | `docs/clinical-protocol-berg-items` |

---

## Resposta ao usuário (modelo)

```markdown
Branch **`feature/mobile-login-rf002`** criada a partir de **`develop`**.

- Base: `develop` @ `a1b2c3d`
- Commits: use conventional-commits (English)
- Merge target: `develop` via PR when ready
```
