/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Post, Body, UseGuards, Get, Request, Put, HttpCode, HttpStatus, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDtoSchema, LoginDtoSchema, ChangePasswordDtoSchema, ForgotPasswordDtoSchema, ResetPasswordDtoSchema, type RegisterDto, type LoginDto, type ChangePasswordDto, type ForgotPasswordDto, type ResetPasswordDto } from './auth.dto';
import type { AuthData } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { ApiResponse as ApiResponseType } from '../common/api-response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterDtoSchema))
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponseType<AuthData>> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginDtoSchema))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<ApiResponseType<AuthData>> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  @UsePipes(new ZodValidationPipe(ChangePasswordDtoSchema))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponseType<{ message: string }>> {
    return this.authService.changePassword((req.user as { id: number }).id, changePasswordDto);
  }

  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(ForgotPasswordDtoSchema))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponseType<{ message: string }>> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(ResetPasswordDtoSchema))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto): ApiResponseType<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (client-side token removal)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout(): ApiResponseType<{ message: string }> {
    // Since JWT is stateless, logout is handled client-side by removing the token
    return this.authService.logout();
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
