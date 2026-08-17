/** Rótulos curtos por item — espelham `frontend/.../questionnaires/*.ts` para o relatório PDF. */

export type InstrumentItemMeta = {
  key: string;
  label: string;
  maxScore: number;
};

const BERG_ITEMS: InstrumentItemMeta[] = [
  { key: 'berg_1', label: 'Sentado — em pé', maxScore: 4 },
  { key: 'berg_2', label: 'Em pé sem apoio', maxScore: 4 },
  { key: 'berg_3', label: 'Sentado sem apoio', maxScore: 4 },
  { key: 'berg_4', label: 'Em pé para sentado', maxScore: 4 },
  { key: 'berg_5', label: 'Transferência', maxScore: 4 },
  { key: 'berg_6', label: 'Em pé — olhos fechados', maxScore: 4 },
  { key: 'berg_7', label: 'Em pé — pés juntos', maxScore: 4 },
  { key: 'berg_8', label: 'Alcançar à frente', maxScore: 4 },
  { key: 'berg_9', label: 'Pegar objeto do chão', maxScore: 4 },
  { key: 'berg_10', label: 'Olhar para trás', maxScore: 4 },
  { key: 'berg_11', label: 'Girar 360°', maxScore: 4 },
  { key: 'berg_12', label: 'Pés alternados no degrau', maxScore: 4 },
  { key: 'berg_13', label: 'Um pé à frente', maxScore: 4 },
  { key: 'berg_14', label: 'Em pé sobre uma perna', maxScore: 4 },
];

const TINETTI_ITEMS: InstrumentItemMeta[] = [
  { key: 'tinetti_1', label: 'Equilíbrio sentado', maxScore: 1 },
  { key: 'tinetti_2', label: 'Levantando', maxScore: 2 },
  { key: 'tinetti_3', label: 'Tentativas de levantar', maxScore: 2 },
  { key: 'tinetti_4', label: 'Imediatamente após levantar', maxScore: 2 },
  { key: 'tinetti_5', label: 'Equilíbrio em pé', maxScore: 2 },
  { key: 'tinetti_6', label: 'Teste dos três tempos', maxScore: 2 },
  { key: 'tinetti_7', label: 'Olhos fechados', maxScore: 1 },
  { key: 'tinetti_8', label: 'Girando 360°', maxScore: 2 },
  { key: 'tinetti_9', label: 'Sentando', maxScore: 2 },
  { key: 'tinetti_10', label: 'Iniciação da marcha', maxScore: 1 },
  { key: 'tinetti_11', label: 'Comprimento e altura do passo', maxScore: 4 },
  { key: 'tinetti_12', label: 'Simetria do passo', maxScore: 1 },
  { key: 'tinetti_13', label: 'Continuidade do passo', maxScore: 1 },
  { key: 'tinetti_14', label: 'Desvio da linha reta', maxScore: 2 },
  { key: 'tinetti_15', label: 'Tronco', maxScore: 2 },
  { key: 'tinetti_16', label: 'Base de apoio', maxScore: 1 },
];

const KATZ_ITEMS: InstrumentItemMeta[] = [
  { key: 'katz_1', label: 'Tomar banho', maxScore: 0 },
  { key: 'katz_2', label: 'Vestir-se', maxScore: 0 },
  { key: 'katz_3', label: 'Uso do vaso sanitário', maxScore: 0 },
  { key: 'katz_4', label: 'Transferências', maxScore: 0 },
  { key: 'katz_5', label: 'Continência', maxScore: 0 },
  { key: 'katz_6', label: 'Alimentação', maxScore: 0 },
];

const MEEM_ITEMS: InstrumentItemMeta[] = [
  { key: 'meem_or_1', label: 'Orientação — dia da semana', maxScore: 1 },
  { key: 'meem_or_2', label: 'Orientação — dia do mês', maxScore: 1 },
  { key: 'meem_or_3', label: 'Orientação — mês', maxScore: 1 },
  { key: 'meem_or_4', label: 'Orientação — ano', maxScore: 1 },
  { key: 'meem_or_5', label: 'Orientação — hora', maxScore: 1 },
  { key: 'meem_or_6', label: 'Orientação — local', maxScore: 1 },
  { key: 'meem_or_7', label: 'Orientação — instituição', maxScore: 1 },
  { key: 'meem_or_8', label: 'Orientação — bairro', maxScore: 1 },
  { key: 'meem_or_9', label: 'Orientação — cidade', maxScore: 1 },
  { key: 'meem_or_10', label: 'Orientação — estado', maxScore: 1 },
  { key: 'meem_registro', label: 'Registro (memória imediata)', maxScore: 3 },
  { key: 'meem_atencao', label: 'Atenção e cálculo', maxScore: 5 },
  { key: 'meem_evocacao', label: 'Evocação (lembrança)', maxScore: 3 },
  { key: 'meem_l1', label: 'Linguagem — nomeação', maxScore: 2 },
  { key: 'meem_l2', label: 'Linguagem — repetição', maxScore: 1 },
  { key: 'meem_l3', label: 'Linguagem — comando em 3 etapas', maxScore: 3 },
  { key: 'meem_l4', label: 'Linguagem — leitura e obediência', maxScore: 1 },
  { key: 'meem_l5', label: 'Linguagem — escrita', maxScore: 1 },
  { key: 'meem_l6', label: 'Linguagem — cópia do desenho', maxScore: 1 },
];

export const REPORT_INSTRUMENT_ITEMS: Record<string, InstrumentItemMeta[]> = {
  BERG: BERG_ITEMS,
  TINETTI: TINETTI_ITEMS,
  KATZ: KATZ_ITEMS,
  MEEM: MEEM_ITEMS,
};

const KATZ_LEVEL_LABELS: Record<string, string> = {
  independente: 'Independente',
  assistencia: 'Assistência',
  dependente: 'Dependente',
};

export function formatKatzLevel(value: string): string {
  return KATZ_LEVEL_LABELS[value] ?? value;
}
