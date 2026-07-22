import { z } from 'zod';

import { SCORING_RULE_VERSIONS, TINETTI_CLASSIFICATION } from '../../../scoring-rules';
import type { InstrumentHandler } from '../types';
import { InstrumentPayloadError } from '../types';

const TINETTI_ITEM_LIMITS: Record<string, { min: number; max: number }> = {
  tinetti_1: { min: 0, max: 1 },
  tinetti_2: { min: 0, max: 2 },
  tinetti_3: { min: 0, max: 2 },
  tinetti_4: { min: 0, max: 2 },
  tinetti_5: { min: 0, max: 2 },
  tinetti_6: { min: 0, max: 2 },
  tinetti_7: { min: 0, max: 1 },
  tinetti_8: { min: 0, max: 2 },
  tinetti_9: { min: 0, max: 2 },
  tinetti_10: { min: 0, max: 1 },
  tinetti_11: { min: 0, max: 4 },
  tinetti_12: { min: 0, max: 1 },
  tinetti_13: { min: 0, max: 1 },
  tinetti_14: { min: 0, max: 2 },
  tinetti_15: { min: 0, max: 2 },
  tinetti_16: { min: 0, max: 1 },
};

const BALANCE_KEYS = Array.from({ length: 9 }, (_, index) => `tinetti_${index + 1}`);
const GAIT_KEYS = Array.from({ length: 7 }, (_, index) => `tinetti_${index + 10}`);
const TINETTI_ITEM_KEYS = [...BALANCE_KEYS, ...GAIT_KEYS];

const tinettiShape = Object.fromEntries(
  TINETTI_ITEM_KEYS.map((key) => {
    const limits = TINETTI_ITEM_LIMITS[key];
    return [key, z.number().int().min(limits.min).max(limits.max)];
  }),
) as Record<string, z.ZodNumber>;

const tinettiPayloadSchema = z.object(tinettiShape).strict();

export type TinettiPayload = z.infer<typeof tinettiPayloadSchema>;

export function parseTinettiPayload(payload: unknown): TinettiPayload {
  const parsed = tinettiPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InstrumentPayloadError('TINETTI', formatIssues(parsed.error));
  }
  return parsed.data;
}

export function scoreTinetti(payload: TinettiPayload): number {
  const balanceSubtotal = BALANCE_KEYS.reduce((total, key) => total + payload[key], 0);
  const gaitSubtotal = GAIT_KEYS.reduce((total, key) => total + payload[key], 0);

  return balanceSubtotal + gaitSubtotal;
}

export function classifyTinetti(rawValue: number) {
  const band =
    TINETTI_CLASSIFICATION.find((entry) => rawValue <= entry.max) ??
    TINETTI_CLASSIFICATION[TINETTI_CLASSIFICATION.length - 1];

  return {
    rawLabel: `${rawValue}/28`,
    classificationLabel: band.label,
    classificationCode: band.code,
    classificationMeta: {
      versionTag: SCORING_RULE_VERSIONS.tinetti,
      rawValue,
      maxScore: 28,
    },
  };
}

export const tinettiHandler: InstrumentHandler<TinettiPayload> = {
  code: 'TINETTI',
  parsePayload: parseTinettiPayload,
  score: scoreTinetti,
  classify: classifyTinetti,
};

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    issue: issue.message,
  }));
}
