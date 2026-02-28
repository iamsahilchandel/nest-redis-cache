import type { RefreshToken, NewRefreshToken } from '@/infrastructure/database/schemas/refresh-token.schema';

export interface IRefreshTokenRepository {
  create(data: NewRefreshToken): Promise<RefreshToken>;
  findById(id: number): Promise<RefreshToken | null>;
  revokeById(id: number): Promise<void>;
  revokeAllForUser(userId: number): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
