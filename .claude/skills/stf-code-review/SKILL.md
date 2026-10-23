---
name: stf-code-review
description: Reviews code changes for the Senior Teste Funcional project using the Claude Code /code-review and /security-review skills plus project checklists (LGPD, therapist isolation, server-side scoring, OpenAPI). Use when the user asks for code review, revisão de código, review PR/branch, or before merging backend/frontend changes.
disable-model-invocation: true
---

# Code Review — Senior Teste Funcional

Revisão de código **específica deste projeto**: skills nativas do Claude Code (`/code-review` e `/security-review`) + checklist de domínio (saúde, LGPD, API como fonte da verdade).

**Somente quando o usuário pedir** — não revisar por iniciativa própria após cada edit.

## Escopo da revisão

Se o usuário não especificar, use **AskUserQuestion** (ou pergunte) com opções:

| Opção | O que roda |
|-------|------------|
| **Completa (recomendado)** | `/security-review` + `/code-review` + checklist do projeto |
| **Segurança** | `/security-review` + checklist § Segurança/LGPD |
| **Bugs / lógica** | `/code-review` + checklist § Domínio clínico e API |

Para mudanças em `auth`, `patients`, `assessments`, JWT ou PDF → preferir **Completa** ou **Segurança**.

## Fluxo obrigatório

```
Task Progress:
- [ ] 1. Identificar diff alvo (branch vs uncommitted)
- [ ] 2. Ler session/ recente se existir contexto de RF
- [ ] 3. Rodar a(s) skill(s) de revisão conforme escopo
- [ ] 4. Aplicar checklist do projeto ([reference.md](reference.md))
- [ ] 5. Consolidar relatório único (template abaixo)
- [ ] 6. Não corrigir código salvo pedido explícito
```

### Passo 1 — Diff alvo

| Pedido do usuário | Alvo da revisão |
|-------------------|-----------------|
| Padrão / branch atual | diff da branch vs `develop`/`main` |
| Só working tree local | mudanças não commitadas |
| PR ou branch citada | `git checkout` na ref antes de revisar |

Repositório: raiz deste repo (`stf-api`).

### Passo 2 — Skills de revisão do Claude Code

Invocar via `Skill`, **uma por vez**:

- **`security-review`** — foco em segurança. Contexto do projeto a passar como instrução: dados de saúde (TUG/Katz/Berg/Tinetti/MEEM), isolamento `therapist_id`, JWT, tokens de reset de senha, controle de acesso ao PDF, nenhum payload clínico em log.
- **`code-review`** — foco em bugs e qualidade. Contexto: scoring só no `finalize`, schema Zod por instrumento, estrato Katz = contagem de `D`, MEEM usa `schooling_band_used` da sessão. Passe o nível desejado (`/code-review high` para cobertura ampla) e, se o usuário pedir, `--comment` (comentários no PR) ou `--fix` (aplicar correções).

Se uma skill não estiver disponível no ambiente → siga só com o checklist do projeto e avise o usuário.

### Passo 3 — Checklist do projeto

Depois das skills, percorrer [reference.md](reference.md) nas seções relevantes ao diff (backend, frontend, docs com impacto em contrato).

Marcar cada item: ✅ ok · ⚠️ risco · ❌ falha · ➖ não aplicável.

### Passo 4 — Relatório consolidado

Responder em **português** com:

```markdown
# Code Review — [escopo] — [branch ou "uncommitted"]

## Resumo
[1–3 frases: merge-ready? bloqueadores?]

## Revisão automatizada
| Fonte | Achados |
|-------|---------|
| /security-review | N issues / tabela |
| /code-review | N issues / tabela |

## Checklist projeto
| Área | Status | Nota |
|------|--------|------|

## Bloqueadores (must fix)
- …

## Sugestões (should fix)
- …

## Nice to have
- …
```

Tabelas de achados: colunas **Severity**, **Location (file:line)**, **Finding** — severidade decrescente.

## Áreas de atenção rápida

| Área alterada | Foco extra |
|---------------|------------|
| `auth/` | Mensagem genérica login; hash Argon2id; TTL reset 10 min; token invalidado |
| `patients/` | `therapist_id` em toda query; MEEM schooling no cadastro |
| `assessments/` | Scoring só no `finalize`; DRAFT vs FINALIZED; Zod por `instrument_code` |
| `reports/` | PDF só do dono; gráfico ≥2 do mesmo instrumento |
| `frontend/` | Sem scoring local; API real; WCAG se UI; rule `figma-screens-required` |
| `docs/contracts/` | Snapshot alinhado à implementação |

## Referências

- Checklist detalhado: [reference.md](reference.md)
- Exemplos de pedido: [examples.md](examples.md)
- LGPD: rule `lgpd-sensitive-data-review` + [docs/product/privacy-and-lgpd.md](../../../../senior-test-funcional/docs/product/privacy-and-lgpd.md)
- Domínio API: [docs/backend/README.md](../../../docs/backend/README.md)

## Não fazer

- Commit, push ou aplicar fixes sem pedido
- Substituir assessoria jurídica LGPD
- Aprovar merge com isolamento `therapist_id` quebrado ou scoring no cliente
