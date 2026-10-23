# Índice de Katz — Atividades Básicas de Vida Diária (ABVD)

## Fonte do método

Roteiro de preenchimento e **estratos 0 a 6** conforme **formulário / PDF do projeto** (três opções por domínio: Independente, Assistência, Dependente). Referência histórica do índice: **Katz et al., JAMA 1963**.

## 1) O que é

O Índice de Katz avalia a independência do paciente em **Atividades Básicas de Vida Diária (ABVD)**, indicando necessidade de ajuda/assistência/dependência.

## 2) Regra de preenchimento (conforme PDF)

- Tentar obter as informações com o paciente, se possível.
- Quando o paciente não souber informar, anotar que a informação não foi dada por ele e utilizar o campo do acompanhante.
- Para cada área de função, checar a descrição que melhor se adapta.
- O termo “assistência” tem conotação de **supervisão** ou **assistência direta de pessoas**.

## 3) Itens avaliados e opções (conforme PDF)

### 1. Tomar banho (leito, banheira ou chuveiro)

- **Independente:** Não recebe ajuda
- **Assistência:** Recebe ajuda para lavar apenas uma parte do corpo (ex.: costas ou uma perna)
- **Dependente:** Recebe ajuda para lavar mais de uma parte do corpo, ou não toma banho sozinho

### 2. Vestir-se

_(pega roupa, inclusive íntimas, nos armários/gavetas e manuseia fechos, inclusive os de órteses/próteses quando utilizadas)_

- **Independente:** Pega as roupas e veste-se completamente, sem ajuda
- **Assistência:** Pega as roupas e veste-se sem ajuda, exceto para amarrar os sapatos
- **Dependente:** Recebe ajuda para pegar as roupas ou vestir-se, ou permanece parcial ou completamente sem roupa

### 3. Uso do vaso sanitário

_(ida ao banheiro/local equivalente para evacuar e urinar; higiene íntima e arrumação das roupas)_

- **Independente:** Vai ao banheiro ou equivalente, limpa-se e ajeita as roupas sem ajuda  
  (pode usar objetos de apoio como bengala/andador/cadeira de rodas; pode usar comadre/urinol à noite, esvaziando-o de manhã)
- **Assistência:** Recebe ajuda para ir ao banheiro/local equivalente, para limpar-se ou para ajeitar as roupas após eliminações, ou para usar comadre/urinol
- **Dependente:** Não vai ao banheiro ou equivalente para eliminações fisiológicas

### 4. Transferências

- **Independente:** Deita-se e sai da cama, senta-se e levanta-se da cadeira sem ajuda  
  (pode usar objeto de apoio como bengala/andador)
- **Assistência:** Deita-se e sai da cama e/ou senta-se e levanta-se da cadeira com ajuda
- **Dependente:** Não sai da cama

### 5. Continência

- **Independente:** Controla inteiramente a micção e a evacuação
- **Assistência:** Tem “acidentes” ocasionais
- **Dependente:** Necessita de ajuda para manter o controle da micção e evacuação; usa cateter ou é incontinente

### 6. Alimentação

- **Independente:** Alimenta-se sem ajuda
- **Assistência:** Alimenta-se sozinho, mas recebe ajuda para cortar carne ou passar manteiga no pão
- **Dependente:** Recebe ajuda para alimentar-se, ou é alimentado parcial ou completamente pelo uso de cateteres ou fluídos intravenosos

## 4) Resultado / estratos (conforme PDF)

O PDF orienta: analisar os estratos abaixo de acordo com a pontuação acima, para definir e assinalar em qual estrato o paciente se encontra:

- **0 – INDEPENDENTE** para todas as atividades
- **1 – Dependente** para UMA atividade
- **2 – Dependente** para DUAS atividades
- **3 – Dependente** para TRÊS atividades
- **4 – Dependente** para QUATRO atividades
- **5 – Dependente** para CINCO atividades
- **6 – Dependente** para TODAS as atividades

## 5) Como o app deve calcular (recomendação de implementação coerente com o PDF)

- Para cada item, o app coleta: `Independente`, `Assistência` ou `Dependente`.
- Para o “estrato”, contar **quantos itens** foram marcados como **Dependente** (0–6) e mapear diretamente para o resultado acima.
  - Ex.: 2 itens “Dependente” → estrato “2 – Dependente para DUAS atividades”.

> Observação: o PDF não define estrato específico para “Assistência” isoladamente; por isso, para reproduzir fielmente o resultado apresentado, o cálculo do estrato deve considerar o **número de itens Dependentes**.

## 6) Campos recomendados para o app

- Nome, idade, sexo
- Para cada item: seleção (Independente/Assistência/Dependente)
- Fonte da informação por item (Paciente/Acompanhante) — opcional, mas útil
- Observações (texto livre)
- Estrato final (0–6) calculado automaticamente

## 7) Referências

- Katz S, Ford AB, Moskowitz RW, Jackson BA, Jaffe MW. Studies of illness in the aged: The Index of ADL. JAMA. 1963.
- Katz Index of Independence in Activities of Daily Living (ADL). Hartford Institute for Geriatric Nursing / NYU Rory Meyers College of Nursing.
