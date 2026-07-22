import { z } from 'zod';

import {
  BERG_CLASSIFICATION,
  SCORING_RULE_VERSIONS,
} from '../../../scoring-rules';
import type { InstrumentHandler } from '../types';
import { InstrumentPayloadError } from '../types';

const BERG_ITEM_KEYS = Array.from({ length: 14 }, (_, index) => `berg_${index + 1}`);

const bergItemSchema = z.number().int().min(0).max(4);

const bergPayloadSchema = z
  .object(
    Object.fromEntries(BERG_ITEM_KEYS.map((key) => [key, bergItemSchema])) as Record<
      string,
      typeof bergItemSchema
    >,
  )
  .strict();

export type BergPayload = z.infer<typeof bergPayloadSchema>;

export function parseBergPayload(payload: unknown): BergPayload {
  const parsed = bergPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InstrumentPayloadError('BERG', formatIssues(parsed.error));
  }
  return parsed.data;
}

export function scoreBerg(payload: BergPayload): number {
  return BERG_ITEM_KEYS.reduce((total, key) => total + payload[key], 0);
}

export function classifyBerg(rawValue: number) {
  const band =
    BERG_CLASSIFICATION.find((entry) => rawValue <= entry.max) ??
    BERG_CLASSIFICATION[BERG_CLASSIFICATION.length - 1];

  return {
    rawLabel: `${rawValue}/56`,
    classificationLabel: band.label,
    classificationCode: band.code,
    classificationMeta: {
      versionTag: SCORING_RULE_VERSIONS.berg,
      rawValue,
      maxScore: 56,
    },
  };
}

export const bergHandler: InstrumentHandler<BergPayload> = {
  code: 'BERG',
  parsePayload: parseBergPayload,
  score: scoreBerg,
  classify: classifyBerg,
};

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    issue: issue.message,
  }));
}
