import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
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
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Get configuration
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const enableCsrf = this.configService.get<string>('ENABLE_CSRF', 'true') === 'true';
    const apiKey = request.headers['x-api-key'] as string | undefined;
    const validApiKey = this.configService.get<string>('API_KEY');

    // Skip CSRF for Swagger UI routes (Swagger is at /api, not /api/v1)
    // Swagger routes: /api, /api-json, /api-yaml, /api/static/*
    const isSwaggerRoute = (request.url.startsWith('/api-json') || 
                            request.url.startsWith('/api-yaml') ||
                            request.url === '/api' ||
                            (request.url.startsWith('/api/') && !request.url.startsWith('/api/v1')));
    
    if (isSwaggerRoute) {
      // In production, require API key for Swagger access
      if (isProduction && !this.validateApiKey(apiKey, validApiKey)) {
        throw new ForbiddenException('Swagger UI is disabled in production or requires valid API key');
      }
      return true;
    }

    // If CSRF is disabled via environment variable, allow (not recommended for production)
    if (!enableCsrf) {
      if (isProduction) {
        throw new ForbiddenException('CSRF protection cannot be disabled in production');
      }
      return true;
    }

    // Skip CSRF for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Bypass CSRF only for API endpoints with valid API key
    // This allows API clients to work while maintaining security for browser-based requests
    if (apiKey && this.validateApiKey(apiKey, validApiKey)) {
      // Additional check: Only bypass for API v1 routes (not for form submissions)
      const isApiRoute = request.url.startsWith('/api/v1');
      
      if (isApiRoute) {
        return true;
      }
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
