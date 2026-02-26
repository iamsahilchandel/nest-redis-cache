import { INestApplication, Logger } from '@nestjs/common';
import csurf from 'csurf';
import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';

/**
 * Constant-time API key comparison to prevent timing attacks.
 * Enterprise applications use this pattern for all secret comparisons.
 */
function validateApiKey(providedKey: string | undefined, validKey: string | undefined): boolean {
  if (!providedKey || !validKey) {
    return false;
  }

  // Normalize keys by trimming whitespace
  const normalizedProvided = providedKey.trim();
  const normalizedValid = validKey.trim();

  // Convert to buffers for constant-time comparison
  const providedBuffer = Buffer.from(normalizedProvided, 'utf8');
  const validBuffer = Buffer.from(normalizedValid, 'utf8');

  // Ensure buffers are the same length to prevent timing attacks
  if (providedBuffer.length !== validBuffer.length) {
    // Still do comparison to maintain constant time
    timingSafeEqual(providedBuffer, Buffer.alloc(providedBuffer.length));
    return false;
  }

  return timingSafeEqual(providedBuffer, validBuffer);
}

/**
 * Configure CSRF protection middleware
 */
export function configureCsrf(app: INestApplication): void {
  const logger = new Logger('CSRF');
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV');
  const apiKey = configService.get<string>('API_KEY');

  // CSRF protection middleware with secure configuration
  const csrfMiddleware = csurf({
    cookie: {
      httpOnly: true,
      secure: nodeEnv === 'production', // HTTPS only in production
      sameSite: 'strict' as const, // Strict same-site policy
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  });

  // Secure CSRF middleware with proper validation
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for Swagger UI routes (Swagger is at /api, not /api/v1)
    // Swagger routes: /api, /api-json, /api-yaml, /api/static/*
    const requestUrl = req.url;
    const swaggerRoutes = ['/api-json', '/api-yaml', '/api', '/api/static'];
    const isSwaggerRoute = swaggerRoutes.some((route) => requestUrl.startsWith(route));

    if (isSwaggerRoute) return next(); // In production, Swagger access is controlled by CsrfGuard

    // Skip CSRF for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    // Check if valid API key is provided (for API clients)
    const providedApiKey = req.headers['x-api-key'] as string | undefined;
    const isValidApiKey = validateApiKey(providedApiKey, apiKey);

    if (nodeEnv !== 'production' && providedApiKey) {
      logger.debug(`API Key validation: provided=${providedApiKey ? 'yes' : 'no'}, valid=${isValidApiKey}`);
    }

    if (isValidApiKey) {
      // Only bypass CSRF for API v1 routes (not for form submissions)
      const isApiRoute = req.url.startsWith('/api/v1');

      if (isApiRoute) return next();
    }

    // For all other requests, apply CSRF protection
    csrfMiddleware(req, res, next);
  });
}
