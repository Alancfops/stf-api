---
name: git-branching
description: Manages Git branch workflow for Senior Teste Funcional — develop as integration branch, feature/hotfix/docs branches from naming conventions, merge targets, and safe git commands. Use when starting new work, creating or switching branches, opening features, hotfixes, docs changes, merge/rebase, or when the user mentions branches, develop, feature branch, or git flow.
---

# Git branching

Fluxo **Git Flow simplificado** para este projeto. Branches e merges **somente quando o usuário pedir** — não criar branch nem push por iniciativa própria.

Alinhado a [docs/engineering/repository-and-workflow.md](../../../../senior-test-funcional/docs/engineering/repository-and-workflow.md) §6 e skill **`conventional-commits`** nos commits.

## Ramificações

| Branch | Papel |
|--------|--------|
| **`main`** | Estável / pronta para release; sempre compilável quando houver código |
| **`develop`** | Integração do dia a dia; base para novas funcionalidades |
| **`feature/*`** | Nova funcionalidade (RF, endpoint, tela, módulo) |
| **`hotfix/*`** | Correção urgente em produção (`main`) |
| **`docs/*`** | Só documentação (`docs/`, AGENTS, specs) |
| **`fix/*`** | Bug não urgente (integração via `develop`) |
| **`chore/*`** | Tooling, CI, deps, `.claude/` sem feat/fix de produto |

**Regra:** trabalho de funcionalidade **nunca** commita direto em `develop`/`main` — abrir branch temática primeiro.

---

## Convenção de nomes

Formato: `<prefix>/<escopo>-<descricao-curta>` — **inglês**, kebab-case, minúsculas.

| Prefix | Exemplo | Escopo sugerido |
|--------|---------|-----------------|
| `feature/` | `feature/auth-login-rf002` | `auth`, `patients`, `assessments`, `frontend`, `api` |
| `hotfix/` | `hotfix/pdf-generation-timeout` | área afetada |
| `docs/` | `docs/openapi-contracts` | tema do doc |
| `fix/` | `fix/patient-search-filter` | área |
| `chore/` | `chore/claude-wcag-skill` | `claude`, `ci`, `deps` |

Conforme [repository-and-workflow §6](../../../../senior-test-funcional/docs/engineering/repository-and-workflow.md): usar **`feature/backend-auth`**, **`feature/mobile-login`**, etc. — **não** o prefixo legado `feat/`.

Descricao curta = 2–5 palavras; sem espaços; sem `#` ou caracteres especiais.

---

## Fluxos

### A — Nova funcionalidade (padrão)

```
develop → feature/<name> → develop → (release) → main
```

```
Task Progress:
- [ ] 1. Atualizar develop
- [ ] 2. Criar feature branch
- [ ] 3. Commits (conventional-commits, inglês)
- [ ] 4. Merge/PR em develop
- [ ] 5. Limpar branch local (opcional, se pedido)
```

```bash
rtk git fetch origin
rtk git checkout develop
rtk git pull origin develop
rtk git checkout -b feature/<scope>-<short-desc>
# … trabalho + commits …
rtk git push -u origin HEAD
# merge via PR ou merge local em develop — conforme pedido do usuário
```

### B — Documentação

Base: **`develop`** (ou **`main`** se hotfix doc isolado e usuário pedir).

```bash
rtk git checkout develop && rtk git pull origin develop
rtk git checkout -b docs/<short-desc>
```

### C — Hotfix (produção)

Base: **`main`**.

```
main → hotfix/<name> → main + develop
```

```bash
rtk git fetch origin
rtk git checkout main
rtk git pull origin main
rtk git checkout -b hotfix/<scope>-<short-desc>
# … fix + test …
rtk git push -u origin HEAD
# merge em main; depois merge/cherry-pick em develop (usuário decide)
```

### D — Bug em desenvolvimento (não urgente)

Base: **`develop`**.

```bash
rtk git checkout -b fix/<scope>-<short-desc>
```

### E — Release (develop → main)

Só quando usuário pedir release:

```bash
rtk git checkout main
rtk git pull origin main
rtk git merge develop
rtk git push origin main
rtk git checkout develop
```

Tag opcional: `v0.1.0` — semver quando houver versões publicadas.

---

## Escolher prefixo

| Situação | Branch |
|----------|--------|
| Novo RF, endpoint, tela, scoring | `feature/` |
| Só `docs/**`, README, specs | `docs/` |
| Bug em prod / bloqueio imediato | `hotfix/` |
| Bug em develop, não urgente | `fix/` |
| Skills, rules, CI, gitignore | `chore/` |

---

## Com `develop` ainda inexistente

Se só existir `main`:

1. Confirmar com usuário se pode criar `develop` a partir de `main`.
2. Uma vez:

```bash
rtk git checkout main
rtk git pull origin main
rtk git checkout -b develop
rtk git push -u origin develop
```

Daí em diante, features saem de `develop`.

---

## Proibido (salvo pedido explícito)

- ❌ `git push --force` em **`main`** ou **`develop`**
- ❌ Commit direto em `main`/`develop` para feature em andamento
- ❌ Branch com nome vago (`feature/test`, `fix/stuff`)
- ❌ Alterar `git config`
- ❌ Merge sem usuário ter pedido
- ❌ Assinaturas de IA em commits (ver `conventional-commits`)

---

## Checklist antes de abrir branch

1. Qual **RF/escopo**? → nome da branch
2. Base correta? (`develop` vs `main` para hotfix)
3. Working tree limpa ou stash combinado com usuário
4. Commits futuros: skill **`conventional-commits`**

---

## Relatório ao usuário (após criar branch)

```markdown
**Branch:** `feature/auth-login-rf002`
**Base:** `develop` @ `<short-sha>`
**Próximo:** implementar … ; commits com conventional-commits ; PR → develop
```

---

## Recursos

- Prefixos, merges, conflitos: [reference.md](reference.md)
- Exemplos por cenário: [examples.md](examples.md)
- Commits: `.claude/skills/conventional-commits/`
