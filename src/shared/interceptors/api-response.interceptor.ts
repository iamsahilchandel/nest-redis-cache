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
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        if (this.isPaginatedResponse(data)) {
          return ApiResponseBuilder.successWithPagination(data.items, data.pagination, data.metadata, data.message);
        }

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
