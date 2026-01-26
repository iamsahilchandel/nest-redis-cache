/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Put,
  HttpCode,
  HttpStatus,
  UsePipes,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDtoSchema,
  LoginDtoSchema,
  ChangePasswordDtoSchema,
  ForgotPasswordDtoSchema,
  ResetPasswordDtoSchema,
  type RegisterDto,
  type LoginDto,
  type ChangePasswordDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  RegisterDtoSwagger,
  LoginDtoSwagger,
  ChangePasswordDtoSwagger,
  ForgotPasswordDtoSwagger,
  ResetPasswordDtoSwagger,
} from './dto/auth.dto';
import type { AuthData } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import type { ApiResponse as ApiResponseType } from '../../common/api-response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterDtoSchema))
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDtoSwagger })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponseType<AuthData>> {
    this.logger.log(`Register attempt for email: ${registerDto.email}`);
    try {
      const result = await this.authService.register(registerDto);
      this.logger.log(`User registered successfully: ${registerDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Registration failed for email: ${registerDto.email}`, error.stack);
      throw error;
    }
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginDtoSchema))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDtoSwagger })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<ApiResponseType<AuthData>> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    try {
      const result = await this.authService.login(loginDto);
      this.logger.log(`Login successful for email: ${loginDto.email}`);
      return result;
    } catch (error) {
      this.logger.warn(`Login failed for email: ${loginDto.email} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  getProfile(@Request() req: any) {
    this.logger.log(`Profile request for user ID: ${req.user?.id}`);
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  @UsePipes(new ZodValidationPipe(ChangePasswordDtoSchema))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDtoSwagger })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponseType<{ message: string }>> {
    const userId = (req.user as { id: number }).id;
    this.logger.log(`Password change request for user ID: ${userId}`);
    try {
      const result = await this.authService.changePassword(userId, changePasswordDto);
      this.logger.log(`Password changed successfully for user ID: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Password change failed for user ID: ${userId}`, error.stack);
      throw error;
    }
  }

  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(ForgotPasswordDtoSchema))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDtoSwagger })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponseType<{ message: string }>> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(ResetPasswordDtoSchema))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDtoSwagger })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto): ApiResponseType<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin-only')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin only endpoint' })
  @ApiResponse({ status: 200, description: 'Access granted to admin' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  adminOnly() {
    return { message: 'Welcome Admin!' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @Get('seller-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seller and Admin endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Access granted to seller or admin',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  sellerAdminOnly() {
    return { message: 'Welcome Seller or Admin!' };
  }
}
