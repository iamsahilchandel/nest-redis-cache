import { INestApplication } from '@nestjs/common';

export interface CorsOptions {
  allowedOrigins: string | undefined;
  nodeEnv: string | undefined;
}

/**
 * Configure CORS middleware
 */
export function configureCors(app: INestApplication, options: CorsOptions): void {
  const { allowedOrigins: allowedOriginsEnv, nodeEnv } = options;

  const allowedOrigins = allowedOriginsEnv?.split(',') || (nodeEnv === 'production' ? [] : ['http://localhost:3000']);

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
}
