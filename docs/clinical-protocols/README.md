# Protocolos clínicos (referência de aplicação)

Estes Markdown descrevem **como conduzir cada instrumento** em contexto de cuidado, com texto de comando e pontuações de referência. **Não substituem** a especificação de software (**RF**) em [`../product/requirements.md`](../../../senior-test-funcional/docs/product/requirements.md) (em especial RF007–RF010).

```
instruments/
  tug/
  katz/
  berg/
  tinetti/
  meem/
```

| Arquivo | Conteúdo típico |
|---------|----------------|
| Um `*.md` com o nome da pasta (`tug.md`, `katz.md`, …) | Resumo executivo + link para o roteiro completo |
| `assess.md` | Passo a passo, níveis numéricos, referências bibliográficas |

O **tutorial ligado ao RF009**, quando implementado com conteúdo dinâmico no servidor, pode reutilizar trechos destes Markdown; qualquer atualização institucional a cortes ou roteiros exige revisão paralela dos documentos sob `docs/product/` e do software já implantado conforme esse recorte normativo.
