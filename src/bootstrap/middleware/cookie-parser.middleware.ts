import { INestApplication, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';

export interface CookieParserOptions {
  csrfSecret: string | undefined;
  nodeEnv: string | undefined;
}

/**
 * Configure cookie parser middleware
 */
export function configureCookieParser(app: INestApplication, options: CookieParserOptions, logger: Logger): void {
  const { csrfSecret, nodeEnv } = options;

  // Cookie parser for CSRF - require secret in production
  if (!csrfSecret && nodeEnv === 'production') {
    logger.error('CSRF_SECRET environment variable is required in production');
    throw new Error('CSRF_SECRET environment variable is required in production');
  }

  app.use(cookieParser(csrfSecret || 'development-csrf-secret-change-in-production'));
  logger.log('✓ Cookie parser configured');
}
