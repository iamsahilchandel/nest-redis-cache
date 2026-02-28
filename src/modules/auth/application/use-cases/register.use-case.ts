import { Injectable, Inject } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ApiResponseBuilder, ApiResponse } from '@/shared/helpers/api-response';
import { USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY } from '../../domain/ports';
import type { IUserRepository, IRefreshTokenRepository } from '../../domain/ports';
import type { RegisterDto } from '../../presentation/dto/auth.dto';
import type { AuthData } from '../services/auth.service';
import type { StringValue } from 'ms';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async execute(registerDto: RegisterDto): Promise<ApiResponse<AuthData>> {
    const { email, password, firstName, lastName, role = 'buyer', phone, address } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      return ApiResponseBuilder.error('User with this email already exists', 'USER_EXISTS');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const createdUser = await this.userRepo.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      phone,
      address,
    });

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

    await this.refreshTokenRepo.create({ userId: user.id, tokenHash, expiresAt });

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
