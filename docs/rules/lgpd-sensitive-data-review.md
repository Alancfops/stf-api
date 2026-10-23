---
description: Exige revisão LGPD antes de concluir alterações que envolvam dados sensíveis ou pessoais
---

# Revisão LGPD obrigatória

Qualquer alteração relacionada a **dados pessoais ou sensíveis** deve passar por **revisão LGPD** antes de ser considerada concluída.

## O que dispara a revisão

Trate como escopo LGPD alterações que envolvam:

- Cadastro ou identificação de **paciente** ou **fisioterapeuta**
- **Avaliações clínicas**, resultados, payloads, PDFs ou histórico
- **Foto/avatar**, escolaridade (MEEM), contato, credenciais ou tokens
- **Logs**, exportações, cache, backup, retenção ou exclusão de dados
- Novos campos, integrações, subprocessadores ou fluxos de titular (art. 18)

Referência: [docs/product/privacy-and-lgpd.md](../../../senior-test-funcional/docs/product/privacy-and-lgpd.md) (§3 inventário, §10 checklist).

## O que fazer antes de concluir

1. **Pare e declare** que a mudança exige revisão LGPD (não finalize como “pronto” sem isso).
2. **Classifique** a categoria de dado (pessoal vs. sensível/saúde) e a finalidade.
3. **Verifique** o checklist da §10: autorização (`therapist_id`), minimização, retenção, subprocessador, aviso de privacidade.
4. **Proponha** ajustes em docs afetados (`privacy-and-lgpd.md`, `requirements.md`, `data-model.md`) quando a mudança alterar tratamento de dados.
5. **Sinalize pendências** para o controlador/jurídico (base legal, DPO, contratos art. 41) — o agente **não substitui** assessoria jurídica.

## Exemplos

```markdown
❌ Adicionar campo `Patient.notes` clínico sem mencionar LGPD
✅ Declarar impacto LGPD, classificar como dado sensível de saúde e listar itens do checklist §10 pendentes
```

```markdown
❌ Integrar analytics de terceiro sem avaliar subprocessador (§8)
✅ Bloquear conclusão até documentar operador, dados expostos e necessidade de DPA
```

## Limite

Esta regra orienta **engenharia e documentação interna**. Bases legais finais, avisos ao titular e decisões do DPO competem ao **controlador**, com jurídico.
