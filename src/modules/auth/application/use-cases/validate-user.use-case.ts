import { Injectable, Inject } from '@nestjs/common';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import type { User } from '../../../../infrastructure/database/schemas/user.schema';

@Injectable()
export class ValidateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(userId: number): Promise<User | null> {
    return this.userRepo.findById(userId);
  }
}
