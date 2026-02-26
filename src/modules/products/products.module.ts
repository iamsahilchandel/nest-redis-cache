import { Module } from '@nestjs/common';
import { ProductsController } from './presentation/controllers/products.controller';
import { ProductsService } from './application/services/products.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
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
  imports: [DatabaseModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    CreateProductUseCase,
    FindAllProductsUseCase,
    FindOneProductUseCase,
    FindBySlugUseCase,
    GetFeaturedProductsUseCase,
    UpdateProductUseCase,
    UpdateInventoryUseCase,
    RemoveProductUseCase,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
