import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiResponseInterceptor } from './interceptors/api-response.interceptor';
import { HttpLoggerInterceptor } from './interceptors/http-logger.interceptor';
import { CacheModule } from '../modules/cache/cache.module';

@Global()
@Module({
  imports: [CacheModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggerInterceptor,
    },
  ],
  exports: [CacheModule],
})
export class CommonModule {}
