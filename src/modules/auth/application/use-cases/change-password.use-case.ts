import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY } from '../../domain/ports';
import type { IUserRepository, IRefreshTokenRepository } from '../../domain/ports';
import type { ChangePasswordDto } from '../../presentation/dto/auth.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(userId: number, changePasswordDto: ChangePasswordDto): Promise<ApiResponse<{ message: string }>> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return ApiResponseBuilder.error('User not found', 'USER_NOT_FOUND');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return ApiResponseBuilder.error('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.userRepo.updatePassword(userId, hashedNewPassword);

    // Revoke all refresh tokens on password change for security
    await this.refreshTokenRepo.revokeAllForUser(userId);

    return ApiResponseBuilder.success({ message: 'Password changed successfully' });
  }
}
