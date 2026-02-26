import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import {
  DomainException,
  EntityNotFoundException,
  EntityConflictException,
  ValidationException,
  UnauthorizedException,
  ForbiddenException,
} from '../domain/exceptions';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = this.mapToHttpStatus(exception);

    this.logger.warn(`Domain exception [${exception.code}]: ${exception.message}`);

    response.status(status).json({
      success: false,
      error: {
        code: exception.code,
        message: exception.message,
        details: exception.details,
      },
    });
  }

  private mapToHttpStatus(exception: DomainException): number {
    if (exception instanceof EntityNotFoundException) return HttpStatus.NOT_FOUND;
    if (exception instanceof EntityConflictException) return HttpStatus.CONFLICT;
    if (exception instanceof ValidationException) return HttpStatus.BAD_REQUEST;
    if (exception instanceof UnauthorizedException) return HttpStatus.UNAUTHORIZED;
    if (exception instanceof ForbiddenException) return HttpStatus.FORBIDDEN;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
