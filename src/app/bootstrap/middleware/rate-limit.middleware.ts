import { INestApplication } from '@nestjs/common';
import { rateLimit } from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

/**
 * Apply rate-limiting middleware to the Nest application.
 */
export function configureRateLimit(app: INestApplication) {
  const configService = app.get(ConfigService);
  const rateLimitWindowMs = configService.get<string>('RATE_LIMIT_WINDOW_MS')!;
  const rateLimitMax = configService.get<string>('RATE_LIMIT_MAX')!;
  app.use(
    rateLimit({
      windowMs: Number(rateLimitWindowMs),
      max: Number(rateLimitMax),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      skip: (req) => ['/health', '/metrics'].includes(req.path),
    }),
  );
}
