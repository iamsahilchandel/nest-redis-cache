import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const enableCsrf = this.configService.get<string>('ENABLE_CSRF', 'true') === 'true';
    const apiKey = request.headers['x-api-key'] as string | undefined;
    const validApiKey = this.configService.get<string>('API_KEY');

    const path = request.path;

    const swaggerRoutes = ['/api', '/api-json', '/api-yaml', '/api/static/*'];
    const isSwaggerRoute = swaggerRoutes.some((route) => path.startsWith(route));

    if (isSwaggerRoute) {
      if (isProduction && !this.validateApiKey(apiKey, validApiKey)) {
        throw new ForbiddenException('Swagger UI is disabled in production or requires valid API key');
      }
      return false;
    }

    if (!enableCsrf) {
      if (isProduction) {
        throw new ForbiddenException('CSRF protection cannot be disabled in production');
      }
      return false;
    }

    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return false;
    }

    if (apiKey && this.validateApiKey(apiKey, validApiKey)) {
      const isApiRoute = path.startsWith('/api/v1');

      if (isApiRoute) return false;
    }

    return true;
  }

  private validateApiKey(providedKey: string | undefined, validKey: string | undefined): boolean {
    if (!providedKey || !validKey) {
      return false;
    }
    const providedBuffer = Buffer.from(providedKey, 'utf8');
    const validBuffer = Buffer.from(validKey, 'utf8');

    if (providedBuffer.length !== validBuffer.length) {
      timingSafeEqual(providedBuffer, Buffer.alloc(validBuffer.length));
      return false;
    }

    return timingSafeEqual(providedBuffer, validBuffer);
  }
}
