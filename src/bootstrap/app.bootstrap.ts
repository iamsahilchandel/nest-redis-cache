import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../app.module';
import { CsrfExceptionFilter } from '../common/csrf-exception.filter';

// Middleware imports
import {
  configureHelmet,
  configureCompression,
  configureCors,
  configureCookieParser,
  configureCsrf,
} from './middleware';

// Swagger configuration
import { configureSwagger } from './swagger.config';

/**
 * Bootstrap the NestJS application
 */
export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const NODE_ENV = configService.get<string>('NODE_ENV');
  const ALLOWED_ORIGINS = configService.get<string>('ALLOWED_ORIGINS');
  const CSRF_SECRET = configService.get<string>('CSRF_SECRET');
  const SERVER_PORT = configService.get<string>('SERVER_PORT') || '3000';
  const API_KEY = configService.get<string>('API_KEY');

  // Log application startup
  logger.log(`🚀 Starting application in ${NODE_ENV || 'development'} mode...`);

  // Set global prefix and filters
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new CsrfExceptionFilter());

  // Configure middleware
  configureHelmet(app);
  configureCompression(app);
  configureCors(app, { allowedOrigins: ALLOWED_ORIGINS, nodeEnv: NODE_ENV });
  configureCookieParser(app, { csrfSecret: CSRF_SECRET, nodeEnv: NODE_ENV }, logger);
  configureCsrf(app, { nodeEnv: NODE_ENV, apiKey: API_KEY }, logger);

  // Configure Swagger documentation
  configureSwagger(app, SERVER_PORT);

  // Start the application
  await app.listen(SERVER_PORT);

  logger.log(`✅ Application is running on: http://localhost:${SERVER_PORT}`);
  logger.log(`📚 Swagger UI available at: http://localhost:${SERVER_PORT}/api`);
  logger.log(`🔗 API endpoints available at: http://localhost:${SERVER_PORT}/api/v1`);
}
