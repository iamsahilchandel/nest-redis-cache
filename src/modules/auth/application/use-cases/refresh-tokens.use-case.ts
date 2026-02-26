import { Injectable, Inject } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { users } from '../../../../infrastructure/database/schemas/user.schema';
import { refreshTokens, NewRefreshToken } from '../../../../infrastructure/database/schemas/refresh-token.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import type { StringValue } from 'ms';

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async execute(
    userId: number,
    refreshTokenId: number,
  ): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    // Find user
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return ApiResponseBuilder.error('User not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      return ApiResponseBuilder.error('Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Revoke the old refresh token
    await this.db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.id, refreshTokenId));

    // Generate new tokens
    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return ApiResponseBuilder.success(
      { access_token: accessToken, refresh_token: refreshToken },
      undefined,
      'Tokens refreshed successfully',
    );
  }

  private async generateTokens(user: {
    id: number;
    email: string;
    role: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY') ?? '7d';
    const options: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: refreshTokenExpiry as StringValue,
    };
    const refreshToken = this.jwtService.sign(payload, options);

    const saltRounds = 10;
    const tokenHash = await bcrypt.hash(refreshToken, saltRounds);

    const expiryString = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY', '7d');
    const expiresAt = this.calculateExpiryDate(expiryString);

    const newRefreshToken: NewRefreshToken = { userId: user.id, tokenHash, expiresAt };
    await this.db.insert(refreshTokens).values(newRefreshToken);

    return { accessToken, refreshToken };
  }

  private calculateExpiryDate(expiry: string): Date {
    const now = new Date();
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
