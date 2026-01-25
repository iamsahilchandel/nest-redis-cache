import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import type { Request, Response, RequestHandler } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middlewares
  app.use(helmet());
  app.use(
    (compression as (options: any) => RequestHandler)({
      level: 6,
      threshold: 100 * 1024, // 100 KB
      filter: (req: Request, res: Response): boolean => {
        // Skip compression for already compressed file types
        const contentType = res.getHeader('Content-Type') as string;
        if (contentType) {
          // Images
          if (contentType.includes('image/')) return false;
          // Videos
          if (contentType.includes('video/')) return false;
          // PDFs
          if (contentType.includes('application/pdf')) return false;
          // Archives (already compressed)
          if (contentType.includes('application/zip')) return false;
          if (contentType.includes('application/gzip')) return false;
          if (contentType.includes('application/x-7z-compressed')) return false;
          // Audio files (some are compressed)
          if (contentType.includes('audio/')) return false;
        }

        // Check file extensions in URL as fallback
        const url = req.url || '';
        const compressedExtensions =
          /\.(pdf|jpg|jpeg|png|gif|webp|svg|mp4|avi|mkv|mov|wmv|flv|webm|mp3|wav|aac|ogg|zip|rar|7z|gz|bz2)$/i;
        if (compressedExtensions.test(url)) {
          return false;
        }

        // Apply compression for other content (default compression logic)
        const acceptEncoding = req.headers['accept-encoding'] as string;
        const contentEncoding = res.getHeader('Content-Encoding') as string;
        return !!(acceptEncoding && acceptEncoding.includes('gzip') && !contentEncoding);
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Cookie parser for CSRF
  app.use(cookieParser(process.env.CSRF_SECRET || 'default-csrf-secret'));

  // CSRF protection
  app.use(
    csurf({
      cookie: true,
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('E-Commerce API with Redis Caching')
    .setDescription(
      'A Nest.js e-commerce API demonstrating Redis caching best practices for product management and performance optimization.',
    )
    .setVersion('1.0.0')
    .addTag('auth', 'Authentication and user management')
    .addTag('products', 'Product management endpoints')
    .addTag('cache', 'Caching management and monitoring')
    .addTag('api', 'General API endpoints')
    .addTag('hot', 'Hot/Featured endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'api-key')
    .addServer(`http://localhost:${process.env.SERVER_PORT ?? 3000}`, 'Local')
    .addServer('https://dev.yourapp.com', 'Development')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.SERVER_PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error during application bootstrap:', err);
});
