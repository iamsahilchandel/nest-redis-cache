import { z } from 'zod';

export const RegisterDtoSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  role: z.enum(['buyer', 'seller', 'admin']).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const LoginDtoSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const ChangePasswordDtoSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;

export const ForgotPasswordDtoSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;

export const ResetPasswordDtoSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;