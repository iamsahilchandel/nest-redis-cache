import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Zod Schemas for validation
export const RegisterDtoSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  role: z.enum(['buyer', 'seller', 'admin']).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
});

export const LoginDtoSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const ChangePasswordDtoSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

export const ForgotPasswordDtoSchema = z.object({
  email: z.email(),
});

export const ResetPasswordDtoSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string(),
});

// TypeScript types
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
export type LoginDto = z.infer<typeof LoginDtoSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

// Swagger DTOs for API documentation
export class RegisterDtoSwagger {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'User password (minimum 6 characters)', example: 'password123', minLength: 6 })
  password!: string;

  @ApiProperty({ description: 'User first name', example: 'John', maxLength: 100 })
  firstName!: string;

  @ApiProperty({ description: 'User last name', example: 'Doe', maxLength: 100 })
  lastName!: string;

  @ApiPropertyOptional({ description: 'User role', enum: ['buyer', 'seller', 'admin'], example: 'buyer' })
  role?: 'buyer' | 'seller' | 'admin';

  @ApiPropertyOptional({ description: 'User phone number', example: '+1234567890', maxLength: 20 })
  phone?: string;

  @ApiPropertyOptional({ description: 'User address', example: '123 Main St, City, Country' })
  address?: string;
}

export class LoginDtoSwagger {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  password!: string;
}

export class ChangePasswordDtoSwagger {
  @ApiProperty({ description: 'Current password', example: 'oldPassword123' })
  currentPassword!: string;

  @ApiProperty({ description: 'New password (minimum 6 characters)', example: 'newPassword123', minLength: 6 })
  newPassword!: string;
}

export class ForgotPasswordDtoSwagger {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email!: string;
}

export class ResetPasswordDtoSwagger {
  @ApiProperty({ description: 'Password reset token', example: 'reset-token-here' })
  token!: string;

  @ApiProperty({ description: 'New password (minimum 6 characters)', example: 'newPassword123', minLength: 6 })
  newPassword!: string;
}

export class RefreshTokenDtoSwagger {
  @ApiProperty({
    description: 'Refresh token received during login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;
}
