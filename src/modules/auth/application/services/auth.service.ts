import { Injectable } from '@nestjs/common';
import type { User } from '../../../../infrastructure/database/schemas/user.schema';
import type { ApiResponse } from '../../../../shared/helpers/api-response';
import type { RegisterDto, LoginDto, ChangePasswordDto } from '../../presentation/dto/auth.dto';
import { RegisterUseCase } from '../use-cases/register.use-case';
import { LoginUseCase } from '../use-cases/login.use-case';
import { RefreshTokensUseCase } from '../use-cases/refresh-tokens.use-case';
import { LogoutUseCase } from '../use-cases/logout.use-case';
import { ValidateUserUseCase } from '../use-cases/validate-user.use-case';
import { ChangePasswordUseCase } from '../use-cases/change-password.use-case';
import { ForgotPasswordUseCase } from '../use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../use-cases/reset-password.use-case';

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

/**
 * AuthService - Thin facade that delegates to individual use cases.
 *
 * Each public method corresponds to a single use case, keeping the service
 * class focused on orchestration while business logic lives in use cases.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly registerUC: RegisterUseCase,
    private readonly loginUC: LoginUseCase,
    private readonly refreshTokensUC: RefreshTokensUseCase,
    private readonly logoutUC: LogoutUseCase,
    private readonly validateUserUC: ValidateUserUseCase,
    private readonly changePasswordUC: ChangePasswordUseCase,
    private readonly forgotPasswordUC: ForgotPasswordUseCase,
    private readonly resetPasswordUC: ResetPasswordUseCase,
  ) {}

  async register(registerDto: RegisterDto): Promise<ApiResponse<AuthData>> {
    return this.registerUC.execute(registerDto);
  }

  async login(loginDto: LoginDto): Promise<ApiResponse<AuthData>> {
    return this.loginUC.execute(loginDto);
  }

  async refreshTokens(
    userId: number,
    refreshTokenId: number,
  ): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    return this.refreshTokensUC.execute(userId, refreshTokenId);
  }

  async logout(userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.logoutUC.execute(userId);
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.validateUserUC.execute(userId);
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.changePasswordUC.execute(userId, changePasswordDto);
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.forgotPasswordUC.execute(email);
  }

  resetPassword(token: string, newPassword: string): ApiResponse<{ message: string }> {
    return this.resetPasswordUC.execute(token, newPassword);
  }
}
