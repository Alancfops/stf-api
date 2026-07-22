import { z } from 'zod';

import { KATZ_STRATUM_LABELS, SCORING_RULE_VERSIONS } from '../../../scoring-rules';
import type { InstrumentHandler } from '../types';
import { InstrumentPayloadError } from '../types';

const KATZ_LEVEL = z.enum(['independente', 'assistencia', 'dependente']);

const KATZ_ITEM_KEYS = Array.from({ length: 6 }, (_, index) => `katz_${index + 1}`);

const katzPayloadSchema = z
  .object(
    Object.fromEntries(KATZ_ITEM_KEYS.map((key) => [key, KATZ_LEVEL])) as Record<
      string,
      typeof KATZ_LEVEL
    >,
  )
  .strict();

export type KatzPayload = z.infer<typeof katzPayloadSchema>;

export function parseKatzPayload(payload: unknown): KatzPayload {
  const parsed = katzPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InstrumentPayloadError('KATZ', formatIssues(parsed.error));
  }
  return parsed.data;
}

export function scoreKatz(payload: KatzPayload): number {
  return KATZ_ITEM_KEYS.filter((key) => payload[key] === 'dependente').length;
}

export function classifyKatz(rawValue: number) {
  const label = KATZ_STRATUM_LABELS[rawValue] ?? KATZ_STRATUM_LABELS[6];

  return {
    rawLabel: `Estrato ${rawValue}`,
    classificationLabel: label,
    classificationCode: `KATZ_STRATUM_${rawValue}`,
    classificationMeta: {
      versionTag: SCORING_RULE_VERSIONS.katz,
      stratum: rawValue,
      dependentCount: rawValue,
    },
  };
}

export const katzHandler: InstrumentHandler<KatzPayload> = {
  code: 'KATZ',
  parsePayload: parseKatzPayload,
  score: scoreKatz,
  classify: classifyKatz,
};

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    issue: issue.message,
  }));
}
