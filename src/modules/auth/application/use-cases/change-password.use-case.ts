import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { users } from '../../../../infrastructure/database/schemas/user.schema';
import { refreshTokens } from '../../../../infrastructure/database/schemas/refresh-token.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { ChangePasswordDto } from '../../presentation/dto/auth.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(@Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase) {}

  async execute(userId: number, changePasswordDto: ChangePasswordDto): Promise<ApiResponse<{ message: string }>> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

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
    await this.db.update(users).set({ password: hashedNewPassword, updatedAt: new Date() }).where(eq(users.id, userId));

    // Revoke all refresh tokens on password change for security
    await this.db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, userId));

    return ApiResponseBuilder.success({ message: 'Password changed successfully' });
  }
}
