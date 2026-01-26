import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Secure API Key Guard
 *
 * Security features:
 * - Constant-time comparison to prevent timing attacks
 * - Environment-based configuration
 * - Production-ready validation
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // Skip API key check for Swagger UI routes (Swagger is at /api, not /api/v1)
    // Swagger routes: /api, /api-json, /api-yaml, /api/static/*
    const isSwaggerRoute =
      request.url.startsWith('/api-json') ||
      request.url.startsWith('/api-yaml') ||
      request.url === '/api' ||
      (request.url.startsWith('/api/') && !request.url.startsWith('/api/v1'));

    if (isSwaggerRoute) {
      // In production, Swagger is protected by CsrfGuard which requires API key
      if (!isProduction) {
        return true; // Allow in development
      }
      // In production, let CsrfGuard handle Swagger protection
      return true;
    }

    const apiKey = request.headers['x-api-key'] as string | undefined;
    const validApiKey = this.configService.get<string>('API_KEY');

    if (!this.validateApiKey(apiKey, validApiKey)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

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
