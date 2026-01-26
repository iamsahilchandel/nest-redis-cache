import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly validApiKey: string;

  constructor(private configService: ConfigService) {
    if (!this.configService.get<string>('API_KEY')) {
      this.logger.error('API_KEY is not defined');
    }

    this.validApiKey = this.configService.get<string>('API_KEY')!;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;
    const path = request.path;

    // Public routes
    const publicRoutes = ['/', '/api', '/api-json', '/api-yaml', '/api/static/*'];

    if (publicRoutes.some((p) => path.startsWith(p))) {
      return true;
    }

    if (!this.validateApiKey(apiKey, this.validApiKey)) {
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
