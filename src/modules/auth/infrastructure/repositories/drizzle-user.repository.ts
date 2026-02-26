import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { users, type User, type NewUser } from '../../../../infrastructure/database/schemas/user.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { IUserRepository, CreateUserData } from '../../domain/ports/user-repository.port';

@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase) {}

  async findById(id: number): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  async create(data: CreateUserData): Promise<User> {
    const newUser: NewUser = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      phone: data.phone,
      address: data.address,
    };
    const [createdUser] = await this.db.insert(users).values(newUser).returning();
    return createdUser;
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}
