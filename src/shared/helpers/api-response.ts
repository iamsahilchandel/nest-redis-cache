export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  metadata?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ApiResponseBuilder {
  static success<T>(data: T, metadata?: Record<string, any>, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      metadata,
      message,
    };
  }

  static successWithPagination<T>(
    data: T,
    pagination: PaginationMetadata,
    metadata?: Record<string, any>,
    message?: string,
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      metadata,
      pagination,
      message,
    };
  }

  static error(
    message: string,
    code: string = 'INTERNAL_ERROR',
    details?: unknown,
    metadata?: Record<string, any>,
  ): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      metadata,
    };
  }

  static createPaginationMetadata(page: number, limit: number, total: number): PaginationMetadata {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
