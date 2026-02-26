import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { refreshTokens } from '../../../../infrastructure/database/schemas/refresh-token.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';

@Injectable()
export class LogoutUseCase {
  constructor(@Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase) {}

  async execute(userId: number): Promise<ApiResponse<{ message: string }>> {
    // Revoke all refresh tokens for the user
    await this.db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, userId));

    return ApiResponseBuilder.success({ message: 'Logged out successfully' });
  }
}
