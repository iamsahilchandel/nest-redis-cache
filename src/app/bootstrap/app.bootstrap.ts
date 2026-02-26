import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../app.module';
import { CsrfExceptionFilter } from '../../shared/filters/csrf-exception.filter';
import { DomainExceptionFilter } from '../../shared/filters/domain-exception.filter';
import { CorrelationIdMiddleware } from '../../shared/middleware/correlation-id.middleware';

import {
  configureHelmet,
  configureCompression,
  configureCors,
  configureCookieParser,
  configureCsrf,
  configureRateLimit,
} from './middleware';

import { configureSwagger } from './swagger/swagger.config';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);

  const NODE_ENV = configService.get<string>('NODE_ENV');
  const SERVER_PORT = configService.get<string>('SERVER_PORT') || '3000';

  logger.log(`🚀 Starting application in ${NODE_ENV || 'development'} mode...`);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new CsrfExceptionFilter(), new DomainExceptionFilter());

  const correlationMiddleware = app.get(CorrelationIdMiddleware);
  app.use(correlationMiddleware.use.bind(correlationMiddleware));

  configureHelmet(app);
  configureCompression(app);
  configureCors(app);
  configureCookieParser(app);
  configureCsrf(app);
  configureRateLimit(app);

  configureSwagger(app, SERVER_PORT);

  await app.listen(SERVER_PORT);

  logger.log(`✅ Application is running on: http://localhost:${SERVER_PORT}`);
  logger.log(`📚 Swagger UI available at: http://localhost:${SERVER_PORT}/api`);
  logger.log(`🔗 API endpoints available at: http://localhost:${SERVER_PORT}/api/v1`);
}
