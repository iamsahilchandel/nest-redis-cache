import { INestApplication } from '@nestjs/common';
import compression from 'compression';
import type { Request, Response } from 'express';

/**
 * Configure compression middleware
 */
export function configureCompression(app: INestApplication): void {
  app.use(
    compression({
      level: 6,
      filter: (req: Request, res: Response): boolean => {
        if (req.headers['x-no-compression']) return false;
        const contentType = res.getHeader('content-type') as string;
        return !contentType ? true : /^text\/|^application\/(json|javascript|xml|pdf)|^image\/svg/.test(contentType);
      },
    }),
  );
}
