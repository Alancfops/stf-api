---
name: stf-code-review
description: Executa code review do Senior Teste Funcional (skill stf-code-review). Use com /stf-code-review ou quando pedir revisão de código antes do merge.
disable-model-invocation: true
---

# /stf-code-review — Revisão de código

Execute **agora** a skill do projeto **stf-code-review**, seguindo à risca:

@.claude/skills/stf-code-review/SKILL.md

Checklist: @.claude/skills/stf-code-review/reference.md

## Checklist obrigatório

1. Confirmar escopo com o usuário se não foi dito (Completa / Segurança / Bugs).
2. Rodar as skills de revisão (`/security-review`, `/code-review`) conforme a skill do projeto.
3. Aplicar checklist do projeto ao diff.
4. Entregar relatório consolidado em português.
5. **Não** corrigir código nem commitar salvo pedido explícito.
