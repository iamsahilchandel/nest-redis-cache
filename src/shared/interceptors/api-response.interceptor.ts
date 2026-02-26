/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseBuilder } from '../helpers/api-response';

interface PaginatedResponse {
  items: any[];
  pagination: any;
  metadata?: Record<string, any>;
  message?: string;
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If the response is already in ApiResponse format, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Check if this is a paginated response
        if (this.isPaginatedResponse(data)) {
          return ApiResponseBuilder.successWithPagination(data.items, data.pagination, data.metadata, data.message);
        }

        // Regular success response
        return ApiResponseBuilder.success(data);
      }),
    );
  }

  private isPaginatedResponse(data: any): data is PaginatedResponse {
    return (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.items) &&
      data.pagination &&
      typeof data.pagination === 'object'
    );
  }
}
