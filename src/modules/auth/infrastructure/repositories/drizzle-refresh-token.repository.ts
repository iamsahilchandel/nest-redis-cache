import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import {
  refreshTokens,
  type RefreshToken,
  type NewRefreshToken,
} from '../../../../infrastructure/database/schemas/refresh-token.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { IRefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port';

@Injectable()
export class DrizzleRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase) {}

  async create(data: NewRefreshToken): Promise<RefreshToken> {
    const [token] = await this.db.insert(refreshTokens).values(data).returning();
    return token;
  }

  async findById(id: number): Promise<RefreshToken | null> {
    const [token] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.id, id)).limit(1);
    return token || null;
  }

  async revokeById(id: number): Promise<void> {
    await this.db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.id, id));
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, userId));
  }
}
