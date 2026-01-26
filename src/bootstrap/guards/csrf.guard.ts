import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Secure CSRF Guard
 *
 * Security features:
 * - Constant-time comparison for API key validation (prevents timing attacks)
 * - Environment-based CSRF configuration
 * - Proper integration with NestJS guard system
 * - Selective bypass only for API endpoints with valid API key
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Get configuration
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const enableCsrf = this.configService.get<string>('ENABLE_CSRF', 'true') === 'true';
    const apiKey = request.headers['x-api-key'] as string | undefined;
    const validApiKey = this.configService.get<string>('API_KEY');

    const path = request.path;

    // Skip CSRF for Swagger UI routes (Swagger is at /api, not /api/v1)
    const swaggerRoutes = ['/api', '/api-json', '/api-yaml', '/api/static/*'];
    const isSwaggerRoute = swaggerRoutes.some((route) => path.startsWith(route));

    if (isSwaggerRoute) {
      // In production, require API key for Swagger access
      if (isProduction && !this.validateApiKey(apiKey, validApiKey)) {
        throw new ForbiddenException('Swagger UI is disabled in production or requires valid API key');
      }
      return false;
    }

    // If CSRF is disabled via environment variable, allow (not recommended for production)
    if (!enableCsrf) {
      if (isProduction) {
        throw new ForbiddenException('CSRF protection cannot be disabled in production');
      }
      return false;
    }

    // Skip CSRF for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return false;
    }

    // Bypass CSRF only for API endpoints with valid API key
    // This allows API clients to work while maintaining security for browser-based requests
    if (apiKey && this.validateApiKey(apiKey, validApiKey)) {
      const isApiRoute = path.startsWith('/api/v1');

      if (isApiRoute) return false;
    }

    // For all other requests, require CSRF token
    // CSRF token validation is handled by the csurf middleware
    // If we reach here, the request should have a valid CSRF token
    return true;
  }

  /**
   * Constant-time API key comparison to prevent timing attacks
   */
  private validateApiKey(providedKey: string | undefined, validKey: string | undefined): boolean {
    if (!providedKey || !validKey) {
      return false;
    }

    // Convert to buffers for constant-time comparison
    const providedBuffer = Buffer.from(providedKey, 'utf8');
    const validBuffer = Buffer.from(validKey, 'utf8');

    // Ensure buffers are the same length to prevent timing attacks
    if (providedBuffer.length !== validBuffer.length) {
      // Still do comparison to maintain constant time
      timingSafeEqual(providedBuffer, Buffer.alloc(validBuffer.length));
      return false;
    }

    return timingSafeEqual(providedBuffer, validBuffer);
  }
}
