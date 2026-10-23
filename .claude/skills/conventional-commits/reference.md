# Referência — Conventional Commits

## Subject line

- **Imperativo:** "add", "fix", "remove", "update" — not "added", "fixes"
- **Lowercase** after the colon (proper nouns OK: `MEEM`, `JWT`, `OpenAPI`)
- **No trailing period**
- **One logical change** per commit when possible; split unrelated changes

## Body (optional)

- Blank line after subject
- Explain **motivation** and contrast with previous behavior
- Reference issue/RF only if user uses that convention: `Refs RF010` (optional, not required)

## Footer (optional)

```
Refs #42
BREAKING CHANGE: description in English
```

Do **not** add footers that identify an AI tool or assistant.

---

## Type decision tree

```
User-visible behavior change? 
  yes → bug? → fix
  yes → new capability? → feat
  no → tests only? → test
  no → docs only? → docs
  no → CI pipeline? → ci
  no → dependency bump? → build or chore
  no → reformat only? → style
  no → restructure same behavior? → refactor
```

---

## Scope cheat sheet (Senior Teste Funcional)

| Scope | Paths / tema |
|-------|----------------|
| `api` | Backend NestJS geral |
| `auth` | RF001–RF003, JWT, password reset |
| `patients` | RF004–RF006 |
| `assessments` | RF007–RF011, wizard, finalize |
| `instruments` | TUG, Katz, Berg, Tinetti, MEEM scoring |
| `pdf` | RF013, report generation |
| `contracts` | OpenAPI, `docs/contracts/` |
| `frontend` | Expo app, telas, components |
| `docs` | `docs/**`, CLAUDE.md |
| `claude` | `.claude/**` skills, rules, agents |
| `lgpd` | privacy docs, data-handling changes |
| `repo` | gitignore, README raiz, estrutura monorepo |
| `deps` | package.json, lockfiles |

---

## Breaking change (`!`)

Use when consumers must change code or integração quebra:

- Removed/renamed API fields
- Auth flow change
- Required new env var

```
feat(contracts)!: publish OpenAPI v2 assessment schema
```

---

## Revert

```
revert: feat(api): add patient list endpoint

This reverts commit abc1234.
```

---

## Anti-patterns

| Bad | Good |
|-----|------|
| `update stuff` | `docs(frontend): document assessment wizard states` |
| `Fixed bug` | `fix(auth): reject expired password reset tokens` |
| `feat: várias coisas` | split commits or `chore(repo): …` per concern |
| `WIP` | do not commit WIP unless user explicitly asks |
| Long subject with comma lists | short subject + body with details |

---

## Git identity

- **Never** run `git config user.name` / `user.email`
- Commit author is whatever the user already configured locally
- **Never** append machine-generated attribution trailers
