import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

interface CsrfError extends Error {
  code?: string;
}

const HTTP_STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

/**
 * Global Exception Filter
 *
 * Catches all unhandled exceptions and transforms them into consistent
 * API responses. Handles CSRF errors, NestJS HttpExceptions, and
 * unexpected errors with appropriate status codes and error codes.
 */
@Catch()
export class CsrfExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CsrfExceptionFilter.name);

  catch(exception: CsrfError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Check if this is a CSRF-related error
    const isCsrfError =
      exception.code === 'EBADCSRFTOKEN' ||
      exception.message?.toLowerCase().includes('csrf') ||
      exception.message?.toLowerCase().includes('invalid csrf token');

    if (isCsrfError) {
      this.logger.warn(`CSRF validation failed for ${request.method} ${request.url} from IP: ${request.ip}`);

      response.status(HttpStatus.FORBIDDEN).json({
        success: false,
        error:
          'Invalid or missing CSRF token. For API clients, include a valid X-API-KEY header to bypass CSRF protection.',
        code: 'CSRF_TOKEN_INVALID',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // Handle NestJS HttpExceptions (404, 400, 401, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any)?.message || exception.message;

      response.status(status).json({
        success: false,
        error: message,
        code: HTTP_STATUS_CODES[status] || 'ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // Truly unexpected errors — log with stack trace
    const message = exception.message || 'Internal server error';
    this.logger.error(`Unhandled exception for ${request.method} ${request.url}: ${message}`, exception.stack);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
