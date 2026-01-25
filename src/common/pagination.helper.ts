import { ApiResponseBuilder, PaginationOptions } from './api-response';

export class PaginationHelper {
  static getPaginationOptions(query: Record<string, any>): PaginationOptions {
    const page = Math.max(1, parseInt(String(query.page)) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit)) || 10));

    return { page, limit };
  }

  static createPaginatedResponse<T>(
    items: T[],
    total: number,
    options: PaginationOptions,
    metadata?: Record<string, any>,
  ) {
    const pagination = ApiResponseBuilder.createPaginationMetadata(options.page || 1, options.limit || 10, total);

    return ApiResponseBuilder.successWithPagination(items, pagination, metadata);
  }
}
