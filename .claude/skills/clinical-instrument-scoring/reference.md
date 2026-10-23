# Questionários — regras de implementação e casos borda

Referência numérica para a skill `clinical-instrument-scoring`. Em conflito, prevalecem [clinical-protocols](../../../../senior-test-funcional/docs/clinical-protocols/instruments) e [requirements](../../../../senior-test-funcional/docs/product/requirements.md).

---

## Convenção `instrument_code`

| Contexto | Formato |
|----------|---------|
| API JSON, PostgreSQL | **MAIÚSCULAS** — `TUG`, `KATZ`, `BERG`, `TINETTI`, `MEEM` |
| Pastas `assessments/instruments/*`, URL path | **minúsculas** — `tug`, `katz`, … |

---

## TUG (`TUG` / pasta `tug`)

| Campo | Regra |
|-------|--------|
| Coleta | 3 tempos em segundos (ensaios reais pós familiarização) |
| Cálculo | `rawValue = (t1 + t2 + t3) / 3` — média aritmética |
| Payload sugerido | `{ trial1Sec, trial2Sec, trial3Sec, assistiveDevice?: string }` |
| Classificação (padrão) | &lt; 10 · 10–13,4 · ≥ 13,5 s — parametrizável em `scoring-rules` |
| UI | Cronômetro; dispositivo auxiliar opcional |

### Casos borda

| Caso | Esperado |
|------|----------|
| 3 tempos válidos 12, 14, 16 | Média **14** |
| Tempo zero ou negativo | Rejeitar no finalize |
| Campo ausente | Rejeitar no finalize |
| 1 ou 2 tempos só | Rejeitar (RF exige 3) |

---

## Katz (`katz`)

| Campo | Regra |
|-------|--------|
| Coleta | 6 domínios: `I` \| `A` \| `D` |
| Cálculo estrato | `rawValue = count(items where value === 'D')` → **0 a 6** |
| Assistência | Entra na coleta e relatório; **não** incrementa estrato |
| Domínios | banho, vestir, vaso, transferência, continência, alimentação |

### Mapeamento estrato → rótulo

| # Dependente | Rótulo |
|--------------|--------|
| 0 | Independente para todas |
| 1 | Dependente para UMA |
| 2 | Dependente para DUAS |
| … | … |
| 6 | Dependente para TODAS |

### Casos borda

| Entrada (6 itens) | Estrato |
|-------------------|---------|
| I,I,I,I,I,I | **0** |
| D,I,I,I,I,I | **1** |
| D,D,A,A,I,I | **2** (só 2× D) |
| D,D,D,D,D,D | **6** |
| Valor inválido (ex.: `X`) | Rejeitar |

**Erro comum:** somar I+A+D ou tratar A como meio ponto.

---

## Berg (`berg`)

| Campo | Regra |
|-------|--------|
| Coleta | 14 itens, cada um **0–4** |
| Cálculo | `rawValue = sum(item1..item14)` |
| Faixa | **0–56** |
| Classificação (referência) | 0–20 prejuízo · 21–40 aceitável · 41–56 bom |

### Casos borda

| Caso | Esperado |
|------|----------|
| Todos 4 | Total **56** |
| Todos 0 | Total **0** |
| Item 7 ausente | Rejeitar finalize |
| Item com valor 5 | Rejeitar |

---

## Tinetti (`tinetti`)

| Campo | Regra |
|-------|--------|
| Itens 1–9 | Equilíbrio, máx **16** |
| Itens 10–16 | Marcha, máx **12** |
| Item 11 | 4 subpontos (comprimento/altura × 2 pernas) |
| Cálculo | `rawValue = balanceSubtotal + gaitSubtotal` |
| Faixa total | **0–28** |
| Classificação | &lt;19 alto · 19–24 moderado · 25–28 baixo risco |

### Casos borda

| Caso | Esperado |
|------|----------|
| Equilíbrio 16 + marcha 12 | Total **28** |
| Total 18 | Classificação **alto risco** |
| Total 19 | **moderado** (limite inferior) |
| Subtotal equilíbrio &gt; 16 | Rejeitar |

---

## MEEM (`meem`)

| Bloco | Máx pts |
|-------|---------|
| Orientação temporal | 5 |
| Orientação espacial | 5 |
| Registros (3 palavras) | 3 |
| Atenção/cálculo | 5 |
| Evocação | 3 |
| Linguagem L1–L6 | 9 |
| **Total** | **30** |

### Escolaridade → corte Brucki (2003)

| Faixa (`schooling_band_used`) | Corte |
|-------------------------------|-------|
| `analfabeto` | **20** |
| `1_4_anos` | **25** |
| `5_8_anos` | **26.5** |
| `9_11_anos` | **28** |
| `mais_11_anos` | **29** |

Persistir **`schooling_band_used` na Assessment** — não só no Patient.

### Classificação

- `rawValue >= cutoff(schooling_band_used)` → dentro do esperado para faixa (rótulo conforme produto)
- `rawValue < cutoff` → abaixo do corte

### Casos borda

| Caso | Esperado |
|------|----------|
| Total 24, faixa `1_4_anos` (corte 25) | Abaixo do corte |
| Total 25, faixa `1_4_anos` | No/ acima do corte |
| Escolaridade corrigida na sessão | Usar valor da **sessão** |
| Bloco linguagem &gt; 9 pts | Rejeitar |
| Score parcial na UI durante coleta | **Proibido** (RF) |

### Payload mínimo sugerido

```json
{
  "schoolingBandUsed": "5_8_anos",
  "orientationTemporal": { "items": [0,1,1,1,0] },
  "orientationSpatial": { "items": [1,1,1,1,1] },
  "registration": { "score": 3 },
  "attention": { "mode": "serial7", "score": 4 },
  "recall": { "score": 2 },
  "language": { "l1": 2, "l2": 1, "l3": 3, "l4": 1, "l5": 1, "l6": 1 }
}
```

(Ajustar nomes ao schema Zod real; totais devem fechar.)

---

## Matriz RF ↔ servidor ↔ app

| RF | Servidor | App |
|----|----------|-----|
| RF010 | Valida payload parcial em PATCH | Coleta; bloqueia finalize na UX |
| RF011 | Calcula e persiste no finalize | Exibe resposta API |
| RF012 | Timeseries ≥2 pontos mesmo `code` | Gráfico ou mensagem |
| RF013 | PDF bytes | Visualiza/compartilha |

---

## Ordem de implementação sugerida (Fase C — backend)

1. TUG (payload simples)
2. Katz (enum + contagem)
3. Berg (14 inteiros)
4. Tinetti (16 itens + subtotais)
5. MEEM (blocos + escolaridade)

Verificar cada um com esta reference **antes** de passar ao próximo.
