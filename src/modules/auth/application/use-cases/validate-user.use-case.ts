import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { users, User } from '../../../../infrastructure/database/schemas/user.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class ValidateUserUseCase {
  constructor(@Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase) {}

  async execute(userId: number): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user || null;
  }
}
