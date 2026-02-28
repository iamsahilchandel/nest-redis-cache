import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/ports';
import type { IUserRepository } from '../../domain/ports';
import type { User } from '../../../../infrastructure/database/schemas/user.schema';

@Injectable()
export class ValidateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(userId: number): Promise<User | null> {
    return this.userRepo.findById(userId);
  }
}
