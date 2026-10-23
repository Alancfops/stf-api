# Exemplos — conventional-commits

## Documentação

```
docs(backend): describe assessment finalize contract
```

```
docs: add WCAG direction to frontend README
```

```
docs(lgpd): update subprocessors table for email provider
```

## Claude Code / tooling

```
chore(claude): add conventional-commits skill
```

```
chore(claude): add LGPD review rule for sensitive data
```

## Backend (futuro)

```
feat(auth): implement therapist registration with email uniqueness
```

```
feat(patients): add CRUD scoped by therapist_id
```

```
feat(assessments): add finalize endpoint with server-side Berg scoring
```

```
fix(instruments): apply MEEM schooling band from assessment payload
```

```
test(assessments): cover Katz stratum edge cases
```

## Frontend (futuro)

```
feat(frontend): implement login screen from Figma RF002
```

```
fix(frontend): disable finalize until Berg has 14 answers
```

## Contratos

```
feat(contracts): add OpenAPI snapshot for auth routes
```

```
feat(contracts)!: rename assessment status enum values

BREAKING CHANGE: clients must use FINALIZED instead of DONE
```

## Com body

```
fix(auth): hash password reset tokens before persistence

Store only digests of 6-digit codes with 10-minute TTL per RF003.
```

## O que nunca aparece

```
# ❌ WRONG
feat(docs): update readme

Co-authored-by: Claude <noreply@anthropic.com>

# ❌ WRONG
docs: atualiza documentação

# ✅ RIGHT
docs: update repository workflow for phase A delivery
```
