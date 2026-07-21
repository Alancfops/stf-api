import { z } from 'zod';

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
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'O código deve ter 6 dígitos numéricos.'),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
