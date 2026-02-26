import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE_CONNECTION } from '../../infra/database/database.provider';
import { users, User, NewUser } from '../../infra/database/schemas/user.schema';
import { refreshTokens, NewRefreshToken } from '../../infra/database/schemas/refresh-token.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../shared/api-response';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';
import type { StringValue } from 'ms';

export interface AuthData {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface TokenPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async generateTokens(user: {
    id: number;
    email: string;
    role: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token with separate secret and expiry
    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY') ?? '7d';

    const options: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: refreshTokenExpiry as StringValue,
    };
    const refreshToken = this.jwtService.sign(payload, options);

    // Hash and store refresh token in database
    const saltRounds = 10;
    const tokenHash = await bcrypt.hash(refreshToken, saltRounds);

    // Calculate expiry date
    const expiryString = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY', '7d');
    const expiresAt = this.calculateExpiryDate(expiryString);

    const newRefreshToken: NewRefreshToken = {
      userId: user.id,
      tokenHash,
      expiresAt,
    };

    await this.db.insert(refreshTokens).values(newRefreshToken);

    return { accessToken, refreshToken };
  }

  private calculateExpiryDate(expiry: string): Date {
    const now = new Date();
    const match = expiry.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days if parsing fails
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

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

  async register(registerDto: RegisterDto): Promise<ApiResponse<AuthData>> {
    const { email, password, firstName, lastName, role = 'buyer', phone, address } = registerDto;

    // Check if user already exists
    const existingUser = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
      return ApiResponseBuilder.error('User with this email already exists', 'USER_EXISTS');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser: NewUser = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      phone,
      address,
    };

    const [createdUser] = await this.db.insert(users).values(newUser).returning();

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens({
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    });

    const authData: AuthData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        role: createdUser.role,
      },
    };

    return ApiResponseBuilder.success(authData, { userId: createdUser.id }, 'User registered successfully');
  }

  async login(loginDto: LoginDto): Promise<ApiResponse<AuthData>> {
    const { email, password } = loginDto;

    // Find user
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return ApiResponseBuilder.error('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return ApiResponseBuilder.error('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!user.isActive) {
      return ApiResponseBuilder.error('Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const authData: AuthData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };

    return ApiResponseBuilder.success(
      authData,
      { userId: user.id, loginTime: new Date().toISOString() },
      'Login successful',
    );
  }

  async refreshTokens(
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

  async logout(userId: number): Promise<ApiResponse<{ message: string }>> {
    // Revoke all refresh tokens for the user
    await this.db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, userId));

    return ApiResponseBuilder.success({ message: 'Logged out successfully' });
  }

  async validateUser(userId: number): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    return user || null;
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
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

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
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

  resetPassword(token: string, newPassword: string): ApiResponse<{ message: string }> {
    // In a real application, you would:
    // 1. Validate the token
    // 2. Check if it's not expired
    // 3. Find the user associated with the token
    // 4. Update the password
    // 5. Invalidate the token
    void token;
    void newPassword;

    // For now, return an error since we don't have token management implemented
    return ApiResponseBuilder.error(
      'Password reset functionality not fully implemented',
      'NOT_IMPLEMENTED',
    ) as ApiResponse<{ message: string }>;
  }
}
