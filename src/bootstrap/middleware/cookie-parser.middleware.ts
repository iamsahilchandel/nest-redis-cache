import { INestApplication, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

/**
 * Configure cookie parser middleware
 */
export function configureCookieParser(app: INestApplication): void {
  const logger = new Logger('CookieParser');
  const configService = app.get(ConfigService);
  const cookieSecret = configService.get<string>('COOKIE_SECRET');
  const nodeEnv = configService.get<string>('NODE_ENV');

  // Cookie parser for CSRF - require secret in production
  if (!cookieSecret && nodeEnv === 'production') {
    logger.error('COOKIE_SECRET environment variable is required in production');
    throw new Error('COOKIE_SECRET environment variable is required in production');
  }

  app.use(cookieParser(cookieSecret || 'development-cookie-secret-change-in-production'));
  logger.log('✓ Cookie parser configured');
}
