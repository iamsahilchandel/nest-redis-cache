import { Module } from '@nestjs/common';
import { ProductsController } from './presentation/controllers/products.controller';
import { ProductsService } from './application/services/products.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CacheModule } from '../cache/cache.module';
import { PRODUCT_REPOSITORY } from './domain/ports/product-repository.port';
import { DrizzleProductRepository } from './infrastructure/repositories/drizzle-product.repository';
import { ProductCacheInvalidationHandler } from './infrastructure/event-handlers/product-cache-invalidation.handler';
import {
  CreateProductUseCase,
  FindAllProductsUseCase,
  FindOneProductUseCase,
  FindBySlugUseCase,
  GetFeaturedProductsUseCase,
  UpdateProductUseCase,
  UpdateInventoryUseCase,
  RemoveProductUseCase,
} from './application/use-cases';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    // Repository binding: port → adapter
    {
      provide: PRODUCT_REPOSITORY,
      useClass: DrizzleProductRepository,
    },
    // Use cases
    CreateProductUseCase,
    FindAllProductsUseCase,
    FindOneProductUseCase,
    FindBySlugUseCase,
    GetFeaturedProductsUseCase,
    UpdateProductUseCase,
    UpdateInventoryUseCase,
    RemoveProductUseCase,
    // Event handlers
    ProductCacheInvalidationHandler,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
