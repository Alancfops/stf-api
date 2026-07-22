import { z } from 'zod';

import { SCORING_RULE_VERSIONS } from '../../../scoring-rules';
import type { InstrumentHandler } from '../types';
import { InstrumentPayloadError } from '../types';

const tugPayloadSchema = z
  .object({
    trial1Sec: z.number().positive('Tempo do ensaio 1 deve ser maior que zero.'),
    trial2Sec: z.number().positive('Tempo do ensaio 2 deve ser maior que zero.'),
    trial3Sec: z.number().positive('Tempo do ensaio 3 deve ser maior que zero.'),
    assistiveDevice: z.string().trim().max(120).optional().nullable(),
  })
  .strict();

export type TugPayload = z.infer<typeof tugPayloadSchema>;

export function parseTugPayload(payload: unknown): TugPayload {
  const parsed = tugPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InstrumentPayloadError('TUG', formatIssues(parsed.error));
  }
  return parsed.data;
}

export function scoreTug(payload: TugPayload): number {
  return (payload.trial1Sec + payload.trial2Sec + payload.trial3Sec) / 3;
}

export function classifyTug(rawValue: number) {
  let code = 'TUG_HIGH_RISK';
  let label =
    'Maior risco de quedas em idosos da comunidade (média igual ou acima de 13,5 segundos).';

  if (rawValue < 10) {
    code = 'TUG_EXCELLENT';
    label = 'Desempenho funcional muito bom para idosos ativos (média abaixo de 10 segundos).';
  } else if (rawValue < 13.5) {
    code = 'TUG_EXPECTED';
    label =
      'Desempenho funcional esperado, com atenção clínica ao contexto (média entre 10 e 13,4 segundos).';
  }

  return {
    rawLabel: `${rawValue.toFixed(1)} s`,
    classificationLabel: label,
    classificationCode: code,
    classificationMeta: {
      versionTag: SCORING_RULE_VERSIONS.tug,
      rawValue,
      unit: 'seconds',
    },
  };
}

export const tugHandler: InstrumentHandler<TugPayload> = {
  code: 'TUG',
  parsePayload: parseTugPayload,
  score: scoreTug,
  classify: classifyTug,
};

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    issue: issue.message,
  }));
}
