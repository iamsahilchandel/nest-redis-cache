import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { users } from '../../../core/database/schemas/user.schema';
import { refreshTokens, RefreshToken } from '../../../core/database/schemas/refresh-token.schema';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

export interface RefreshJwtPayload {
  sub: number;
  email: string;
  tokenId: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshJwtPayload) {
    const refreshToken = req.body?.refreshToken as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Find user
    const [user] = await this.db.select().from(users).where(eq(users.id, payload.sub)).limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Find valid refresh tokens for this user
    const validTokens = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.userId, user.id), eq(refreshTokens.isRevoked, false)));

    // Check if any of the tokens match
    let matchedToken: RefreshToken | null = null;
    for (const token of validTokens) {
      const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > matchedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      refreshTokenId: matchedToken.id,
    };
  }
}
