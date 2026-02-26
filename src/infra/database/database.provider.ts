import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');

const logger = new Logger('Database');

export const databaseProvider: Provider = {
  provide: DATABASE_CONNECTION,
  useFactory: async (configService: ConfigService) => {
    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      logger.error('❌ DATABASE_URL is not defined in environment variables');
      throw new Error('DATABASE_URL is not defined');
    }

    logger.log('🔄 Attempting to connect to PostgreSQL database...');

    try {
      const client = postgres(connectionString, {
        max: 10, // Maximum number of connections
        idle_timeout: 20, // Idle connection timeout in seconds
        connect_timeout: 10, // Connection timeout in seconds
        onnotice: () => {}, // Suppress notices
      });

      // Test the connection by running a simple query
      await client`SELECT 1`;

      logger.log('✅ Successfully connected to PostgreSQL database');
      logger.log(`📊 Connection pool: max=10, idle_timeout=20s`);

      const db = drizzle(client);

      return db;
    } catch (error) {
      logger.error('❌ Failed to connect to PostgreSQL database');
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
  inject: [ConfigService],
};
