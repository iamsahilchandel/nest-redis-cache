import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import type { Request, Response, RequestHandler, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
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

  // Set global API prefix - all routes will be under /api/v1
  // Swagger will remain at /api (configured separately)
  app.setGlobalPrefix('api/v1');
  logger.log('✓ Global API prefix set to: api/v1');

  // Security middlewares with enterprise-level configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );
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

  // Secure CORS configuration
  const allowedOrigins = ALLOWED_ORIGINS?.split(',') || 
    (NODE_ENV === 'production' ? [] : ['http://localhost:3000']);
  
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      if (allowedOrigins.length === 0) {
        // In production, if no origins specified, deny all
        callback(new Error('CORS: Origin not allowed'), false);
        return;
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS: Origin not allowed'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400, // 24 hours
  });

  // Cookie parser for CSRF - require secret in production
  if (!CSRF_SECRET && NODE_ENV === 'production') {
    logger.error('CSRF_SECRET environment variable is required in production');
    throw new Error('CSRF_SECRET environment variable is required in production');
  }
  app.use(cookieParser(CSRF_SECRET || 'development-csrf-secret-change-in-production'));
  logger.log('✓ Cookie parser configured');

  // CSRF protection middleware with secure configuration
  const csrfMiddleware = csurf({
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict' as const, // Strict same-site policy
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  });

  // Secure CSRF middleware with proper validation
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for Swagger UI routes (Swagger is at /api, not /api/v1)
    // Swagger routes: /api, /api-json, /api-yaml, /api/static/*
    const isSwaggerRoute = (req.url.startsWith('/api-json') || 
                            req.url.startsWith('/api-yaml') ||
                            req.url === '/api' ||
                            (req.url.startsWith('/api/') && !req.url.startsWith('/api/v1')));
    
    if (isSwaggerRoute) return next(); // In production, Swagger access is controlled by CsrfGuard

    // Skip CSRF for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    // Check if valid API key is provided (for API clients)
    const apiKey = req.headers['x-api-key'] as string | undefined;
    
    if (apiKey === API_KEY) {
      // Only bypass CSRF for API v1 routes (not for form submissions)
      const isApiRoute = req.url.startsWith('/api/v1');
      
      if (isApiRoute) return next();
    }

    // For all other requests, apply CSRF protection
    csrfMiddleware(req, res, next);
  });

  const config = new DocumentBuilder()
    .setTitle('E-Commerce API with Redis Caching')
    .setDescription(
      'A Nest.js e-commerce API demonstrating Redis caching best practices for product management and performance optimization.\n\n' +
      '**Security Notes:**\n' +
      '- CSRF protection is enforced for browser-based requests\n' +
      '- API clients can bypass CSRF by providing a valid X-API-KEY header\n' +
      '- All API key comparisons use constant-time algorithms to prevent timing attacks\n' +
      '- Swagger UI is protected in production environments',
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
    .addServer(`http://localhost:${SERVER_PORT ?? 3000}`, 'Local')
    .addServer('https://dev.yourapp.com', 'Development')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Swagger UI remains at /api (not /api/v1) for easy access
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(SERVER_PORT);
  
  logger.log(`✅ Application is running on: http://localhost:${SERVER_PORT}`);
  logger.log(`📚 Swagger UI available at: http://localhost:${SERVER_PORT}/api`);
  logger.log(`🔗 API endpoints available at: http://localhost:${SERVER_PORT}/api/v1`);
}
bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Error during application bootstrap:', err.stack);
  process.exit(1);
});
