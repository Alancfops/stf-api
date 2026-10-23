---
name: verify-instruments
description: Verifica implementação correta dos questionários clínicos (TUG, Katz, Berg, Tinetti, MEEM). Use com /verify-instruments ou quando pedir validação de scoring ou questionário.
disable-model-invocation: true
---

# /verify-instruments — Verificar questionários

Execute **agora** a skill do projeto **clinical-instrument-scoring**, seguindo à risca:

@.claude/skills/clinical-instrument-scoring/SKILL.md

Regras numéricas: @.claude/skills/clinical-instrument-scoring/reference.md

## Checklist obrigatório

1. Identificar qual(is) instrumento(s) revisar (ou inferir pelos arquivos alterados).
2. Ler protocolo clínico correspondente em `docs/clinical-protocols/instruments/`.
3. Verificar Zod, scorer, classify, testes e UI (se houver).
4. Entregar relatório de verificação em português com veredicto.
5. Declarar impacto LGPD se aplicável.
