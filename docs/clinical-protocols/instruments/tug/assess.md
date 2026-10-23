# Timed Up & Go (TUG) Test

## Fonte do método (referência clássica)

Procedimento em linha reta de **3 m**, cronometragem do levantar até sentar após voltar — ver **Podsiadlo e Richardson (1991)**. Revisões sobre pontos de corte para risco de quedas incluem **Barry et al. (2014)**.

## 1. O que é

O TUG avalia a mobilidade básica, o equilíbrio dinâmico e o risco de quedas através do tempo necessário para realizar uma sequência de movimentos funcionais.

## 2. Instruções de Aplicação (conforme protocolo oficial)

- A pessoa pode usar seu calçado usual.
- A pessoa pode usar qualquer dispositivo auxiliar que normalmente utiliza (bengala, andador, etc.).
- Uma tentativa prática deve ser dada ao paciente antes do início dos testes reais.
- O teste consiste em:
  1. Partir da posição sentada na cadeira com as costas apoiadas e braços nos apoios de braço.
  2. Levantar-se e andar uma distância de 10 pés (3 metros).
  3. Virar-se, andar de volta para a cadeira e sentar-se novamente.

## 3. Cronometragem

- **Início:** O tempo começa quando a pessoa começa a levantar-se da cadeira.
- **Fim:** O tempo termina quando a pessoa volta para a cadeira e senta-se.
- **Ensaios:** Devem ser realizados **três ensaios reais** após a tentativa prática.
- **Regra do sistema (padrão do projeto):** o resultado bruto deve ser a **média aritmética dos três ensaios**.

## 4. Resultados preditivos (classificação)

Baseado no tempo necessário para concluir a tarefa:

| Tempo (segundos) | Interpretação clínica (triagem) |
| :--------------- | :------------------------------- |
| **< 10**         | Desempenho funcional muito bom   |
| **10 a 13,4**    | Desempenho funcional esperado    |
| **>= 13,5**      | Maior risco de quedas            |

_Nota: os pontos de corte podem variar por população. No aplicativo, manter limites parametrizáveis para ajuste clínico._

## 5. Requisitos de implementação no aplicativo

- **Coleta de Dados:** O formulário deve ter três campos para inserir os tempos dos três ensaios.
- **Cálculo Automático:** O sistema deve calcular a média entre os três tempos inseridos.
- **Lógica de Interface:**
  - Botão de cronômetro integrado no formulário.
  - Seleção de "Dispositivo Auxiliar usado" (Sim/Não e qual).
- **Feedback visual:** exibir classificação baseada na tabela acima.

## 6. Saída no relatório (PDF)

- Exibição dos tempos de cada ensaio.
- Média final.
- Classificação correspondente.
- Evolução temporal em gráfico (comparando a média atual com avaliações passadas).

## 7. Referências

- Podsiadlo D, Richardson S. The Timed "Up & Go": a test of basic functional mobility for frail elderly persons. J Am Geriatr Soc. 1991.
- Barry E, Galvin R, Keogh C, Horgan F, Fahey T. Is the Timed Up and Go test a useful predictor of risk of falls in community dwelling older adults: a systematic review and meta-analysis. BMC Geriatr. 2014.
