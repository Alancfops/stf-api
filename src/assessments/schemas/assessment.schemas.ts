import { z } from 'zod';

import {
  InstrumentCode,
  isImplementedInstrumentCode,
  normalizeInstrumentCode,
} from '../../common/constants/instruments';
import { SCHOOLING_BAND_VALUES } from '../../common/constants/schooling-band';

export const createDraftSchema = z.object({
  patientId: z.uuid('Informe um paciente válido.'),
  instrumentCode: z
    .string()
    .trim()
    .min(1, 'Informe o instrumento.')
    .transform((value, ctx) => {
      const normalized = normalizeInstrumentCode(value);
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message: 'Instrumento inválido.' });
        return z.NEVER;
      }
      return normalized;
    }),
  schoolingBandUsed: z.enum(SCHOOLING_BAND_VALUES).optional(),
  notesObservation: z.string().trim().max(2000).optional(),
});

export type CreateDraftInput = z.infer<typeof createDraftSchema>;

export const updateDraftSchema = z
  .object({
    payload: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
    schoolingBandUsed: z.enum(SCHOOLING_BAND_VALUES).optional(),
    notesObservation: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.payload !== undefined ||
      value.schoolingBandUsed !== undefined ||
      value.notesObservation !== undefined,
    { message: 'Informe ao menos um campo para atualizar.' },
  );

export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;

const instrumentCodesQuerySchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return Array.isArray(value) ? value : [value];
  },
  z
    .array(z.string())
    .optional()
    .transform((values) => {
      if (!values?.length) {
        return undefined;
      }

      const normalized = values
        .map((item) => normalizeInstrumentCode(item))
        .filter((item): item is InstrumentCode => item !== null);

      if (!normalized.length) {
        return undefined;
      }

      return [...new Set(normalized)];
    }),
);

export const listRecentAssessmentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  instrumentCode: instrumentCodesQuerySchema,
});

export type ListRecentAssessmentsQuery = z.infer<typeof listRecentAssessmentsQuerySchema>;

export function assertDraftInstrumentSupported(instrumentCode: string) {
  if (!isImplementedInstrumentCode(instrumentCode as InstrumentCode)) {
    return {
      supported: false as const,
      message: 'Instrumento não suportado.',
    };
  }

  return { supported: true as const };
}
