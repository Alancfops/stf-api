import { z } from 'zod';

export const listTherapistsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['fullName', 'email', 'createdAt']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const listPatientAssessmentsQuerySchema = z.object({
  status: z.enum(['DRAFT', 'FINALIZED']).optional(),
  instrumentCode: z.enum(['TUG', 'KATZ', 'BERG', 'TINETTI', 'MEEM']).optional(),
});

export const transferPatientSchema = z.object({
  targetTherapistId: z.string().uuid('Informe um fisioterapeuta de destino válido.'),
});

export const listAuditLogsQuerySchema = z.object({
  action: z
    .enum(['DELETE_PATIENT', 'TRANSFER_PATIENT', 'DELETE_THERAPIST', 'DOWNLOAD_REPORT'])
    .optional(),
  adminId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListTherapistsQuery = z.infer<typeof listTherapistsQuerySchema>;
export type ListPatientAssessmentsQuery = z.infer<typeof listPatientAssessmentsQuerySchema>;
export type TransferPatientInput = z.infer<typeof transferPatientSchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
