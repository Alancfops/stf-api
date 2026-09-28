import { z } from 'zod';
import { TherapistRole } from '@prisma/client';

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome completo.')
  .max(250, 'Nome muito longo (máx. 250 caracteres).')
  .regex(
    /^[A-Za-zÀ-ÿ\s]+$/,
    'Nome não pode conter números ou caracteres especiais.',
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail.')
  .email('Digite um e-mail válido');

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres.')
  .refine((value) => (value.match(/\d/g) ?? []).length >= 4, {
    message: 'A senha deve ter pelo menos 4 números.',
  })
  .refine((value) => (value.match(/[A-Za-zÀ-ÿ]/g) ?? []).length >= 2, {
    message: 'A senha deve ter pelo menos 2 letras.',
  })
  .refine((value) => /[A-ZÀ-Ý]/.test(value), {
    message: 'A senha deve ter pelo menos 1 letra maiúscula.',
  })
  .refine((value) => /[a-zà-ÿ]/.test(value), {
    message: 'A senha deve ter pelo menos 1 letra minúscula.',
  });

export const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha.'),
  /** Mobile omite. Gerenciador web envia ADMIN para não autenticar a conta THERAPIST. */
  role: z.nativeEnum(TherapistRole).optional(),
  /** Gerenciador web envia quando não sabe a role exata (ASSISTANT/ADMIN). */
  panel: z.literal('web').optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  /** Mobile omite (THERAPIST). Gerenciador web envia ADMIN. */
  role: z.nativeEnum(TherapistRole).optional(),
  /** Gerenciador web envia quando não sabe a role exata (ASSISTANT/ADMIN). */
  panel: z.literal('web').optional(),
});

export const resetTokenSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'O código deve ter 6 dígitos numéricos.');

export const verifyResetCodeSchema = z.object({
  email: emailSchema,
  token: resetTokenSchema,
  role: z.nativeEnum(TherapistRole).optional(),
  /** Gerenciador web envia quando não sabe a role exata (ASSISTANT/ADMIN). */
  panel: z.literal('web').optional(),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  token: resetTokenSchema,
  password: passwordSchema,
  role: z.nativeEnum(TherapistRole).optional(),
  /** Gerenciador web envia quando não sabe a role exata (ASSISTANT/ADMIN). */
  panel: z.literal('web').optional(),
});

export const adminAccessRequestSchema = z.object({
  email: emailSchema,
  fullName: fullNameSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AdminAccessRequestInput = z.infer<typeof adminAccessRequestSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
