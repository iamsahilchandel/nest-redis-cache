import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { users } from '../../../../infrastructure/database/schemas/user.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(@Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase) {}

  async execute(email: string): Promise<ApiResponse<{ message: string }>> {
    // Find user
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

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
