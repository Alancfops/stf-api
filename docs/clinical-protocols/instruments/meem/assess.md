# MEEM — Mini Exame do Estado Mental

## Fonte do método

Roteiro e pontuação conforme **Folstein et al. (1975)**. Pontos de corte por escolaridade no Brasil: **Brucki et al. (2003)**. Referência adicional sobre impacto da escolaridade: **Bertolucci et al. (1994)**.

## 1) O que é

O MEEM (Mini Exame do Estado Mental) é um instrumento de triagem cognitiva composto por domínios que avaliam orientação, memória, atenção/cálculo e linguagem.

## 2) Pontuação por domínio (conforme PDF / protocolo Folstein)

- **Orientação (temporal e espacial):** **10 itens** → **1 ponto por acerto**, máximo **10 pontos**
- **Registros (memória imediata):** **3 palavras** → máximo **3 pontos**
- **Atenção e cálculo:** tarefa única (7 seriados ou soletração) → máximo **5 pontos**
- **Evocação (lembrança das 3 palavras):** máximo **3 pontos**
- **Linguagem:** subitens descritos na seção **F** (nomeação, repetição, comando em 3 etapas, leitura/obediência, escrita, cópia) → máximo **9 pontos**
- **Total máximo:** **30 pontos**

## 3) Identificação do cliente (campos)

No **aplicativo**, priorizar **dados do cadastro do paciente** (nome, idade, sexo). A **escolaridade** deve:

1. **Provir do cadastro** por padrão — o profissional **confirma** na abertura do MEEM (confirmação explícita ou edição rápida).
2. Se estiver **ausente** no cadastro, **preencher antes** de aplicar cortes (ou abrir edição do cadastro).
3. Qualquer **correção na sessão** deve ser **salva na avaliação** (e, opcionalmente, atualizar o cadastro — decisão de produto).

**Escolaridade** para corte de **Brucki et al., 2003** — **mapear** para uma das faixas:

- **Analfabeto** → corte **20**
- **1 a 4 anos** de estudo → corte **25**
- **5 a 8 anos** → corte **26,5**
- **9 a 11 anos** → corte **28**
- **Mais de 11 anos** → corte **29**

> Se o formulário do projeto usar faixas diferentes (ex.: “0 a 3”, “4 a 8” anos), documente a regra de mapeamento no app para fechar sempre em uma das cinco faixas acima, **sem alterar os pontos de corte originais**.

**Demais campos de cabeçalho:** data da avaliação, avaliador (conforme fluxo clínico do serviço).

### A) Orientação Temporal

**Cada item vale 1 ponto (máximo 5):**

1. Qual é o dia da semana?
2. Dia do mês?
3. Mês?
4. Ano?
5. Hora aproximada?

### B) Orientação Espacial

**Cada item vale 1 ponto (máximo 5):**

6. Onde estamos? Local?  
7. Instituição (casa, rua)?  
8. Bairro?  
9. Cidade?  
10. Estado?

> Somatório orientação temporal + espacial = **10 pontos**.

### C) Registros (memória imediata)

**Instrução (conforme PDF):**  
“Mencione 3 palavras levando 1 segundo para cada uma. Peça ao paciente para repetir as 3 palavras que você mencionou. Estabeleça um ponto para cada resposta correta.”

- Palavras do formulário (conforme PDF): **Vaso, carro, tijolo**
- Pontuação: **0 a 3** (1 ponto por palavra repetida corretamente)

### D) Atenção e cálculo

**Instrução (conforme PDF):**

- “Sete seriado (100-7=93-7=86-7=79-7=72-7=65). Estabeleça um ponto para cada resposta correta. Interrompa a cada cinco respostas.”
- **Ou:** “Soletrar a palavra MUNDO de trás para frente.”

Pontuação máxima: **5 pontos**

> Recomendação de implementação: no app, permitir selecionar qual alternativa foi usada (Sete seriado ou MUNDO), e registrar as respostas para auditoria.

### E) Lembranças (memória de evocação)

**Instrução (conforme PDF):**  
“Pergunte o nome das **3 palavras** pedidas anteriormente no bloco de **Registros**. Estabeleça um ponto para cada resposta correta.”

- Palavras: **Vaso, carro, tijolo**
- Pontuação: **0 a 3**

### F) Linguagem (9 pontos no total; ordem do protocolo)

Pontuação máxima total deste bloco: **9 pontos**

**L1 — Nomeação (2 pontos)**  
   “Aponte para um lápis e um relógio. Faça o paciente dizer o nome desses objetos conforme você os aponta.”

- **0–2 pontos** (1 ponto por item correto)

**L2 — Repetição (1 ponto)**  
   “Faça o paciente repetir: ‘nem aqui, nem ali, nem lá’.”

- **0–1 ponto**

**L3 — Comando de 3 estágios (3 pontos)**  
   “Pegue o papel com a mão direita. Dobre o papel ao meio. Coloque o papel na mesa.”

- **0–3 pontos** (1 ponto por etapa correta)

**L4 — Leitura e obediência (1 ponto)**  
   “Faça o paciente ler e obedecer ao seguinte: FECHE OS OLHOS.”

- **0–1 ponto**

**L5 — Escrita (1 ponto)**  
   “Faça o paciente escrever uma frase de sua própria autoria. (A frase deve conter um sujeito e um objeto e fazer sentido). (Ignore erros de ortografia ao marcar o ponto)”

- **0–1 ponto**

**L6 — Cópia do desenho (1 ponto)**  
    “Copie o desenho abaixo. Estabeleça um ponto se todos os lados e ângulos forem preservados e se os lados da interseção formarem um quadrilátero.”

- **0–1 ponto**

## 5) Total e pontos de corte (conforme PDF)

**TOTAL DE PONTOS OBTIDOS:** \_\_\_\_ / 30

**Pontos de corte — MEEM Brucki et al. (2003):**

- **20** pontos para analfabetos
- **25** pontos para idosos com um a quatro anos de estudo
- **26,5** pontos para idosos com cinco a oito anos de estudo
- **28** pontos para aqueles com 9 a 11 anos de estudo
- **29** pontos para aqueles com mais de 11 anos de estudo

> Importante: a interpretação deve considerar a escolaridade (o app precisa desse dado no cadastro do paciente).

## 6) Campos recomendados para o app (implementação)

- Respostas de orientação (10 campos)
- Registros:
  - repetição imediata das 3 palavras (3 campos booleanos ou contagem)
- Atenção/cálculo:
  - modo utilizado (Sete seriado ou MUNDO)
  - respostas (lista) e pontuação resultante (0–5)
- Evocação:
  - palavras lembradas (3 campos) e pontuação (0–3)
- Linguagem:
  - pontuação por subitem (L1 a L6) e evidências quando aplicável (ex.: texto da frase, cópia do desenho)
- Total calculado automaticamente
- Classificação conforme ponto de corte por escolaridade

## 7) Referências (conforme PDF)

- Folstein MF, Folstein SE, McHugh PR. Mini-Mental State: a practical method for grading the cognitive state of patients for clinician. J Psychiatr Res 1975;12:189-198.
- Bertolucci PHF et al. O Mini-Exame do Estado Mental em uma população geral: impacto da escolaridade. Arq Neuro-Psiquiatria, 1994, 52(1):1-7.
- Brucki SMD et al. Sugestões para o uso do Mini-Exame do Estado Mental no Brasil. Arq Neuro-Psiquiatria, 2003, 61(3):777-781.
