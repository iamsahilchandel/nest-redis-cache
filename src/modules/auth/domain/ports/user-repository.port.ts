import type { User } from '@/infrastructure/database/schemas/user.schema';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  updatePassword(userId: number, hashedPassword: string): Promise<void>;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  phone?: string | null;
  address?: string | null;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
