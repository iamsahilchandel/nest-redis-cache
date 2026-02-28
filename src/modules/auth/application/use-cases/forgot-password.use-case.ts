import { Injectable, Inject } from '@nestjs/common';
import { ApiResponseBuilder, ApiResponse } from '@/shared/helpers/api-response';
import { USER_REPOSITORY } from '../../domain/ports';
import type { IUserRepository } from '../../domain/ports';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(email: string): Promise<ApiResponse<{ message: string }>> {
    // Find user
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return ApiResponseBuilder.success({ message: 'If the email exists, a reset link has been sent' });
    }

    // In a real application, you would:
    // 1. Generate a reset token
    // 2. Store it in the database with expiration
    // 3. Send an email with the reset link
    // For now, we'll just return a success message

    return ApiResponseBuilder.success({ message: 'If the email exists, a reset link has been sent' });
  }
}
