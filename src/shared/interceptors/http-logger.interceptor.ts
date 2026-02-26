import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, headers, body, ip } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    if (url.startsWith('/api') && !url.startsWith('/api/v1')) {
      return next.handle();
    }

    const sanitizedBody = this.sanitizeRequestBody(body);

    this.logger.log(`→ ${method} ${url} | IP: ${ip} | User-Agent: ${userAgent.substring(0, 100)}`);

    if (sanitizedBody && typeof sanitizedBody === 'object' && !Array.isArray(sanitizedBody)) {
      const keys = Object.keys(sanitizedBody as Record<string, unknown>);
      if (keys.length > 0) {
        this.logger.debug(`Request Body: ${JSON.stringify(sanitizedBody)}`);
      }
    }

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // Log response
        const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'log';
        const logMessage = `← ${method} ${url} | ${statusCode} | ${duration}ms`;
        if (logLevel === 'error') {
          this.logger.error(logMessage);
        } else if (logLevel === 'warn') {
          this.logger.warn(logMessage);
        } else {
          this.logger.log(logMessage);
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.logger.error(`← ${method} ${url} | ${statusCode} | ${duration}ms | Error: ${error.message}`, error.stack);

        throw error;
      }),
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'apiKey', 'secret'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
