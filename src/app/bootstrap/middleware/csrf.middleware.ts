import { INestApplication, Logger } from '@nestjs/common';
import csurf from 'csurf';
import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';

function validateApiKey(providedKey: string | undefined, validKey: string | undefined): boolean {
  if (!providedKey || !validKey) {
    return false;
  }

  const normalizedProvided = providedKey.trim();
  const normalizedValid = validKey.trim();
  const providedBuffer = Buffer.from(normalizedProvided, 'utf8');
  const validBuffer = Buffer.from(normalizedValid, 'utf8');

  if (providedBuffer.length !== validBuffer.length) {
    timingSafeEqual(providedBuffer, Buffer.alloc(providedBuffer.length));
    return false;
  }

  return timingSafeEqual(providedBuffer, validBuffer);
}

export function configureCsrf(app: INestApplication): void {
  const logger = new Logger('CSRF');
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV');
  const apiKey = configService.get<string>('API_KEY');

  const csrfMiddleware = csurf({
    cookie: {
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: 'strict' as const,
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestUrl = req.url;
    const swaggerRoutes = ['/api-json', '/api-yaml', '/api', '/api/static'];
    const isSwaggerRoute = swaggerRoutes.some((route) => requestUrl.startsWith(route));

    if (isSwaggerRoute) return next();

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const providedApiKey = req.headers['x-api-key'] as string | undefined;
    const isValidApiKey = validateApiKey(providedApiKey, apiKey);

    if (nodeEnv !== 'production' && providedApiKey) {
      logger.debug(`API Key validation: provided=${providedApiKey ? 'yes' : 'no'}, valid=${isValidApiKey}`);
    }

    const isApiRoute = req.url.startsWith('/api/v1');
    if (isValidApiKey && isApiRoute) return next();

    csrfMiddleware(req, res, next);
  });
}
