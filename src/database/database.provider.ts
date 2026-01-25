import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');

export const databaseProvider: Provider = {
  provide: DATABASE_CONNECTION,
  useFactory: (configService: ConfigService) => {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }
    const client = postgres(connectionString);
    return drizzle(client);
  },
  inject: [ConfigService],
};
