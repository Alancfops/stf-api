import { AssessmentStatus, Prisma } from '@prisma/client';

import type { TimeseriesPoint } from '../assessments/assessments.service';
import {
  BERG_CLASSIFICATION,
  BRUCKI_CUTOFF,
  KATZ_STRATUM_LABELS,
  TINETTI_CLASSIFICATION,
} from '../scoring-rules';
import {
  formatGenderLabel,
  formatSchoolingLabel,
  SCHOOLING_LABELS,
} from './report-pdf.constants';
import { buildReportDifficultyHighlight } from './report-difficulty.util';
import type { ReportPdfData, ReportTimeseriesPoint } from './report-pdf.types';

type AssessmentWithRelations = {
  id: string;
  instrumentCode: string;
  startedAt: Date;
  finalizedAt: Date | null;
  schoolingBandUsed: string | null;
  notesObservation: string | null;
  payload: Prisma.JsonValue;
  result: {
    rawValue: Prisma.Decimal;
    rawLabel: string;
    classificationLabel: string;
    classificationCode: string;
    classificationMeta: Prisma.JsonValue;
  };
  instrument: {
    displayName: string;
    authorsJson: string;
  };
  patient: {
    fullName: string;
    age: number;
    gender: string;
    schoolingBand: string | null;
  };
  therapist: {
    fullName: string;
  };
};

const CHART_Y_AXIS: Record<string, string> = {
  TUG: 'Tempo (s)',
  KATZ: 'Domínios dependentes (0–6)',
  BERG: 'Pontuação (0–56)',
  TINETTI: 'Pontuação (0–28)',
  MEEM: 'Pontuação (0–30)',
};

export function mapAssessmentToReportPdfData(
  assessment: AssessmentWithRelations,
  timeseries: { points: TimeseriesPoint[]; canShowChart: boolean },
  issuedAt: Date,
): ReportPdfData {
  if (assessment.finalizedAt === null) {
    throw new Error('Avaliação não finalizada.');
  }

  const result = assessment.result;
  const meta = asRecord(result.classificationMeta);
  const instrumentCode = assessment.instrumentCode;
  const authors = JSON.parse(assessment.instrument.authorsJson) as string[];
  const schoolingForReport = resolveSchoolingLabel(assessment);
  const issuedParts = formatIssuedAt(issuedAt);
  const sessionParts = formatSessionAt(assessment.finalizedAt);

  return {
    therapistName: assessment.therapist.fullName,
    therapistCrefito: null,
    issueLocation: null,
    issuedAtDateLabel: issuedParts.dateLabel,
    issuedAtTimeLabel: issuedParts.timeLabel,
    patient: {
      fullName: assessment.patient.fullName,
      age: assessment.patient.age,
      genderLabel: formatGenderLabel(assessment.patient.gender),
      schoolingLabel: schoolingForReport,
    },
    assessment: {
      instrumentName: assessment.instrument.displayName,
      instrumentAuthors: authors,
      sessionDateLabel: sessionParts.dateLabel,
      sessionTimeLabel: sessionParts.timeLabel,
      rawLabel: buildRawLabel(instrumentCode, result.rawLabel),
      resultDetailLabel: buildResultDetailLabel(instrumentCode, Number(result.rawValue), result.rawLabel),
      classificationLabel: buildShortClassificationLabel(
        instrumentCode,
        result.classificationCode,
        result.classificationLabel,
      ),
      referenceLabel: buildReferenceLabel(instrumentCode, meta),
      interpretation: result.classificationLabel,
      notesObservation: assessment.notesObservation,
      difficultyHighlight: buildReportDifficultyHighlight(
        instrumentCode,
        asRecord(assessment.payload),
      ),
    },
    evolution: {
      canShowChart: timeseries.canShowChart,
      yAxisLabel: CHART_Y_AXIS[instrumentCode] ?? 'Resultado',
      instrumentCode: instrumentCode.toLowerCase(),
      points: mapTimeseriesPoints(timeseries.points, assessment.id),
    },
    generatedAtLabel: `${issuedParts.dateLabel} ${issuedParts.timeLabel}`,
  };
}

function resolveSchoolingLabel(assessment: AssessmentWithRelations): string | null {
  if (assessment.instrumentCode !== 'MEEM') {
    return null;
  }

  return formatSchoolingLabel(
    assessment.schoolingBandUsed ?? assessment.patient.schoolingBand,
  );
}

function buildRawLabel(instrumentCode: string, rawLabel: string): string {
  if (instrumentCode === 'TUG') {
    return `Tempo: ${rawLabel.replace('.', ',')}`;
  }

  return `Pontuação: ${rawLabel}`;
}

function buildResultDetailLabel(
  instrumentCode: string,
  rawValue: number,
  rawLabel: string,
): string {
  if (instrumentCode === 'TUG') {
    return `${rawValue.toFixed(1).replace('.', ',')} segundos`;
  }

  if (instrumentCode === 'MEEM') {
    return `${Math.round(rawValue)} pontos`;
  }

  if (instrumentCode === 'KATZ') {
    return `${Math.round(rawValue)} domínio(s) dependente(s)`;
  }

  return rawLabel.replace('/', ' de ');
}

function buildShortClassificationLabel(
  instrumentCode: string,
  classificationCode: string,
  fallback: string,
): string {
  if (instrumentCode === 'TUG') {
    if (classificationCode === 'TUG_EXCELLENT') {
      return 'Normal / Baixo risco';
    }
    if (classificationCode === 'TUG_EXPECTED') {
      return 'Risco moderado';
    }
    if (classificationCode === 'TUG_HIGH_RISK') {
      return 'Risco elevado';
    }
  }

  if (instrumentCode === 'MEEM') {
    return classificationCode === 'MEEM_ABOVE_CUTOFF' ? 'Normal' : 'Alterado';
  }

  if (fallback.length <= 72) {
    return fallback;
  }

  return fallback.split('(')[0]?.trim() || fallback;
}

function buildReferenceLabel(instrumentCode: string, meta: Record<string, unknown>): string {
  switch (instrumentCode) {
    case 'TUG':
      return 'TUG < 10 s = excelente; 10–13,4 s = esperado; ≥ 13,5 s = maior risco de quedas';
    case 'KATZ': {
      const stratum = typeof meta.rawValue === 'number' ? meta.rawValue : null;
      if (stratum !== null && KATZ_STRATUM_LABELS[stratum]) {
        return `Estrato Katz ${stratum}: ${KATZ_STRATUM_LABELS[stratum]}`;
      }
      return 'Estrato Katz 0–6 = contagem de domínios classificados como dependentes (D)';
    }
    case 'BERG':
      return BERG_CLASSIFICATION.map((band) => band.label).join('; ');
    case 'TINETTI':
      return TINETTI_CLASSIFICATION.map((band) => band.label).join('; ');
    case 'MEEM': {
      const band = meta.schoolingBandUsed;
      const cutoff = meta.cutoff;
      if (typeof band === 'string' && typeof cutoff === 'number') {
        const schoolingLabel = SCHOOLING_LABELS[band] ?? band;
        return `Corte Brucki para ${schoolingLabel}: ${cutoff} pontos`;
      }
      return `Cortes Brucki parametrizados por escolaridade (${Object.values(BRUCKI_CUTOFF).join(', ')} pontos)`;
    }
    default:
      return 'Referência clínica parametrizada no sistema.';
  }
}

function mapTimeseriesPoints(
  points: TimeseriesPoint[],
  currentAssessmentId: string,
): ReportTimeseriesPoint[] {
  return points.map((point) => ({
    dateLabel: formatChartDateLabel(point.finalizedAt),
    rawValue: point.rawValue,
    rawLabel: point.rawLabel.replace('.', ','),
    classificationLabel: point.classificationLabel,
    isCurrent: point.assessmentId === currentAssessmentId,
  }));
}

function formatChartDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatIssuedAt(date: Date) {
  return {
    dateLabel: formatDateLabel(date),
    timeLabel: formatTimeLabel(date),
  };
}

function formatSessionAt(date: Date) {
  return formatIssuedAt(date);
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function assertFinalizedAssessment(status: AssessmentStatus) {
  if (status !== AssessmentStatus.FINALIZED) {
    throw new Error('Somente avaliações finalizadas geram relatório.');
  }
}
