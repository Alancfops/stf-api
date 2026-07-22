import { z } from 'zod';

import { SCHOOLING_BAND_VALUES } from '../../../common/constants/schooling-band';
import { BRUCKI_CUTOFF, SCORING_RULE_VERSIONS } from '../../../scoring-rules';
import type { InstrumentHandler } from '../types';
import { InstrumentPayloadError } from '../types';

const MEEM_ITEM_LIMITS: Record<string, { min: number; max: number }> = {
  meem_or_1: { min: 0, max: 1 },
  meem_or_2: { min: 0, max: 1 },
  meem_or_3: { min: 0, max: 1 },
  meem_or_4: { min: 0, max: 1 },
  meem_or_5: { min: 0, max: 1 },
  meem_or_6: { min: 0, max: 1 },
  meem_or_7: { min: 0, max: 1 },
  meem_or_8: { min: 0, max: 1 },
  meem_or_9: { min: 0, max: 1 },
  meem_or_10: { min: 0, max: 1 },
  meem_registro: { min: 0, max: 3 },
  meem_atencao: { min: 0, max: 5 },
  meem_evocacao: { min: 0, max: 3 },
  meem_l1: { min: 0, max: 2 },
  meem_l2: { min: 0, max: 1 },
  meem_l3: { min: 0, max: 3 },
  meem_l4: { min: 0, max: 1 },
  meem_l5: { min: 0, max: 1 },
  meem_l6: { min: 0, max: 1 },
};

const MEEM_ITEM_KEYS = Object.keys(MEEM_ITEM_LIMITS);

const meemShape = Object.fromEntries(
  MEEM_ITEM_KEYS.map((key) => {
    const limits = MEEM_ITEM_LIMITS[key];
    return [key, z.number().int().min(limits.min).max(limits.max)];
  }),
) as Record<string, z.ZodNumber>;

const meemPayloadSchema = z.object(meemShape).strict();

export type MeemPayload = z.infer<typeof meemPayloadSchema>;

export function parseMeemPayload(payload: unknown): MeemPayload {
  const parsed = meemPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InstrumentPayloadError('MEEM', formatIssues(parsed.error));
  }
  return parsed.data;
}

export function scoreMeem(payload: MeemPayload): number {
  return MEEM_ITEM_KEYS.reduce((total, key) => total + payload[key], 0);
}

export function classifyMeem(rawValue: number, schoolingBandUsed: (typeof SCHOOLING_BAND_VALUES)[number]) {
  const cutoff = BRUCKI_CUTOFF[schoolingBandUsed];
  const aboveCutoff = rawValue >= cutoff;

  return {
    rawLabel: `${rawValue}/30`,
    classificationLabel: aboveCutoff
      ? `Pontuação igual ou acima do corte Brucki (${cutoff}) para a escolaridade da sessão.`
      : `Pontuação abaixo do corte Brucki (${cutoff}) para a escolaridade da sessão.`,
    classificationCode: aboveCutoff ? 'MEEM_ABOVE_CUTOFF' : 'MEEM_BELOW_CUTOFF',
    classificationMeta: {
      versionTag: SCORING_RULE_VERSIONS.meem,
      rawValue,
      maxScore: 30,
      schoolingBandUsed,
      cutoff,
      aboveCutoff,
    },
  };
}

export const meemHandler: InstrumentHandler<MeemPayload> = {
  code: 'MEEM',
  parsePayload: parseMeemPayload,
  score: scoreMeem,
  classify(rawValue, context) {
    if (!context.schoolingBandUsed) {
      throw new InstrumentPayloadError('MEEM', [
        {
          path: 'schoolingBandUsed',
          issue: 'Informe a escolaridade efetiva da sessão MEEM.',
        },
      ]);
    }

    if (!SCHOOLING_BAND_VALUES.includes(context.schoolingBandUsed)) {
      throw new InstrumentPayloadError('MEEM', [
        {
          path: 'schoolingBandUsed',
          issue: 'Escolaridade da sessão inválida.',
        },
      ]);
    }

    return classifyMeem(rawValue, context.schoolingBandUsed);
  },
};

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    issue: issue.message,
  }));
}
