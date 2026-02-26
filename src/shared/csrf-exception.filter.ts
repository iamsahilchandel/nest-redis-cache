import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

interface CsrfError extends Error {
  code?: string;
}

/**
 * Global CSRF Exception Filter
 *
 * Catches CSRF-related errors from the csurf middleware and transforms them
 * into user-friendly API responses. Enterprise applications use this pattern
 * to prevent leaking stack traces and internal error details.
 *
 * Handled error codes:
 * - EBADCSRFTOKEN: Invalid or tampered CSRF token
 * - CSRF_INVALID: Custom CSRF validation failure
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

    // For non-CSRF errors, let other filters handle them or return generic error
    // This ensures we don't swallow other important exceptions
    const status =
      'getStatus' in exception && typeof exception.getStatus === 'function'
        ? (exception as any).getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception.message || 'Internal server error';

    // Log internal errors with stack trace for debugging
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Unhandled exception for ${request.method} ${request.url}: ${message}`, exception.stack);
    }

    response.status(status).json({
      success: false,
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'An unexpected error occurred' : message,
      code: exception.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
