import { Injectable, Inject } from '@nestjs/common';
import type { IRefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port';
import { REFRESH_TOKEN_REPOSITORY } from '../../domain/ports/refresh-token-repository.port';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';

@Injectable()
export class LogoutUseCase {
  constructor(@Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository) {}

  async execute(userId: number): Promise<ApiResponse<{ message: string }>> {
    // Revoke all refresh tokens for the user
    await this.refreshTokenRepo.revokeAllForUser(userId);

    return ApiResponseBuilder.success({ message: 'Logged out successfully' });
  }
}
