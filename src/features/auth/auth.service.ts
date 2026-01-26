import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { users, User, NewUser } from '../../database/schemas/user.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../common/api-response';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';

export interface AuthData {
  access_token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase,
    private jwtService: JwtService,
  ) {}

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

    // Generate JWT token
    const payload = {
      sub: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    };
    const access_token = this.jwtService.sign(payload);

    const authData: AuthData = {
      access_token,
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

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    const authData: AuthData = {
      access_token,
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
