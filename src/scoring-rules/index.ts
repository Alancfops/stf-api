import type { SchoolingBand } from '../common/constants/schooling-band';

export const SCORING_RULE_VERSIONS = {
  tug: 'tug-cutoff-2026-01',
  katz: 'katz-stratum-v1',
  berg: 'berg-cutoff-2026-01',
  tinetti: 'tinetti-cutoff-2026-01',
  meem: 'meem-brucki-2003',
} as const;

export const BRUCKI_CUTOFF: Record<SchoolingBand, number> = {
  analfabeto: 20,
  '1_4_anos': 25,
  '5_8_anos': 26.5,
  '9_11_anos': 28,
  mais_11_anos: 29,
};

export const BERG_CLASSIFICATION = [
  { max: 20, code: 'BERG_SEVERE', label: 'Risco gravíssimo de quedas (0–20)' },
  { max: 40, code: 'BERG_MODERATE', label: 'Risco moderado a alto de quedas (21–40)' },
  { max: 56, code: 'BERG_LOW', label: 'Baixo risco de quedas (41–56)' },
] as const;

export const TINETTI_CLASSIFICATION = [
  { max: 18, code: 'TINETTI_HIGH', label: 'Alto risco de quedas (<19)' },
  { max: 24, code: 'TINETTI_MODERATE', label: 'Risco moderado de quedas (19–24)' },
  { max: 28, code: 'TINETTI_LOW', label: 'Baixo risco de quedas (25–28)' },
] as const;

export const KATZ_STRATUM_LABELS: Record<number, string> = {
  0: 'Independente em todas as atividades básicas de vida diária.',
  1: 'Dependente em uma atividade.',
  2: 'Dependente em duas atividades.',
  3: 'Dependente em três atividades.',
  4: 'Dependente em quatro atividades.',
  5: 'Dependente em cinco atividades.',
  6: 'Dependente em todas as atividades.',
};
