import { formatKatzLevel, REPORT_INSTRUMENT_ITEMS } from './report-instrument-items.constants';

const MAX_MENTIONED_ITEMS = 3;

type DifficultyCandidate = {
  label: string;
  detail: string;
  severity: number;
};

/** Uma frase curta para o PDF — sem listagem item a item. */
export function buildReportDifficultyHighlight(
  instrumentCode: string,
  payload: Record<string, unknown>,
): string | null {
  switch (instrumentCode) {
    case 'BERG':
    case 'TINETTI':
    case 'MEEM':
      return buildNumericHighlight(instrumentCode, payload);
    case 'KATZ':
      return buildKatzHighlight(payload);
    case 'TUG':
      return buildTugHighlight(payload);
    default:
      return null;
  }
}

function buildNumericHighlight(
  instrumentCode: string,
  payload: Record<string, unknown>,
): string | null {
  const items = REPORT_INSTRUMENT_ITEMS[instrumentCode];
  if (!items) {
    return null;
  }

  const candidates: DifficultyCandidate[] = [];

  for (const item of items) {
    const rawValue = payload[item.key];
    if (typeof rawValue !== 'number' || rawValue >= item.maxScore) {
      continue;
    }

    const severity = (item.maxScore - rawValue) / item.maxScore;

    candidates.push({
      label: item.label,
      detail: `${rawValue}/${item.maxScore}`,
      severity,
    });
  }

  return formatHighlight(candidates, instrumentCode);
}

function buildKatzHighlight(payload: Record<string, unknown>): string | null {
  const items = REPORT_INSTRUMENT_ITEMS.KATZ;
  const candidates: DifficultyCandidate[] = [];

  for (const item of items) {
    const rawValue = payload[item.key];
    if (typeof rawValue !== 'string' || rawValue === 'independente') {
      continue;
    }

    candidates.push({
      label: item.label,
      detail: formatKatzLevel(rawValue),
      severity: rawValue === 'dependente' ? 1 : 0.55,
    });
  }

  return formatHighlight(candidates, 'KATZ');
}

function buildTugHighlight(payload: Record<string, unknown>): string | null {
  const trials = ['trial1Sec', 'trial2Sec', 'trial3Sec'] as const;
  const values: DifficultyCandidate[] = [];

  for (const [index, key] of trials.entries()) {
    const rawValue = payload[key];
    if (typeof rawValue !== 'number') {
      continue;
    }

    values.push({
      label: `ensaio ${index + 1}`,
      detail: `${rawValue.toFixed(1).replace('.', ',')} s`,
      severity: rawValue,
    });
  }

  if (values.length === 0) {
    return null;
  }

  values.sort((a, b) => b.severity - a.severity);
  const slowest = values[0];

  return `O paciente teve mais dificuldade no ${slowest.label} (${slowest.detail}).`;
}

function formatHighlight(
  candidates: DifficultyCandidate[],
  instrumentCode: string,
): string | null {
  if (candidates.length === 0) {
    return 'Nenhum item destacado com dificuldade acentuada nesta avaliação.';
  }

  candidates.sort((a, b) => b.severity - a.severity || a.label.localeCompare(b.label, 'pt-BR'));

  const top = candidates.slice(0, MAX_MENTIONED_ITEMS);
  const parts = top.map((item) => `${item.label} (${item.detail})`);

  if (parts.length === 1) {
    return `O paciente teve mais dificuldade em ${parts[0]}.`;
  }

  const last = parts.pop();
  const prefix =
    instrumentCode === 'KATZ'
      ? 'O paciente teve mais dificuldade nos domínios'
      : 'O paciente teve mais dificuldade em';

  return `${prefix} ${parts.join(', ')} e ${last}.`;
}
