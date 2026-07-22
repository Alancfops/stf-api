import type { ImplementedInstrumentCode } from '../../common/constants/instruments';
import type { SchoolingBand } from '../../common/constants/schooling-band';

export type ClassificationResult = {
  rawLabel: string;
  classificationLabel: string;
  classificationCode: string;
  classificationMeta: Record<string, unknown>;
};

export type ScoreContext = {
  schoolingBandUsed?: SchoolingBand | null;
};

export type InstrumentHandler<TPayload = Record<string, unknown>> = {
  code: ImplementedInstrumentCode;
  parsePayload(payload: unknown): TPayload;
  score(payload: TPayload, context: ScoreContext): number;
  classify(rawValue: number, context: ScoreContext): ClassificationResult;
};

export type InstrumentValidationIssue = {
  path: string;
  issue: string;
};

export class InstrumentPayloadError extends Error {
  constructor(
    readonly instrumentCode: ImplementedInstrumentCode,
    readonly details: InstrumentValidationIssue[],
  ) {
    super(`Payload inválido para instrumento ${instrumentCode}.`);
  }
}
