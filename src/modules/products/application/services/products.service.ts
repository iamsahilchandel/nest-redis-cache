import { Injectable } from '@nestjs/common';
import type { Product } from '../../../../infrastructure/database/schemas/product.schema';
import type { ApiResponse } from '../../../../shared/helpers/api-response';
import type { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../../presentation/dto/product.dto';
import { CreateProductUseCase } from '../use-cases/create-product.use-case';
import { FindAllProductsUseCase, PaginatedProducts } from '../use-cases/find-all-products.use-case';
import { FindOneProductUseCase } from '../use-cases/find-one-product.use-case';
import { FindBySlugUseCase } from '../use-cases/find-by-slug.use-case';
import { GetFeaturedProductsUseCase } from '../use-cases/get-featured-products.use-case';
import { UpdateProductUseCase } from '../use-cases/update-product.use-case';
import { UpdateInventoryUseCase } from '../use-cases/update-inventory.use-case';
import { RemoveProductUseCase } from '../use-cases/remove-product.use-case';

export type { PaginatedProducts };

/**
 * ProductsService - Thin facade that delegates to individual use cases.
 *
 * Each public method corresponds to a single use case, keeping the service
 * class focused on orchestration while business logic lives in use cases.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly createProductUC: CreateProductUseCase,
    private readonly findAllProductsUC: FindAllProductsUseCase,
    private readonly findOneProductUC: FindOneProductUseCase,
    private readonly findBySlugUC: FindBySlugUseCase,
    private readonly getFeaturedProductsUC: GetFeaturedProductsUseCase,
    private readonly updateProductUC: UpdateProductUseCase,
    private readonly updateInventoryUC: UpdateInventoryUseCase,
    private readonly removeProductUC: RemoveProductUseCase,
  ) {}

  async create(createProductDto: CreateProductDto, sellerId?: number): Promise<ApiResponse<Product>> {
    return this.createProductUC.execute(createProductDto, sellerId);
  }

  async findAll(query: ProductQueryDto): Promise<ApiResponse<PaginatedProducts>> {
    return this.findAllProductsUC.execute(query);
  }

  async findOne(id: number): Promise<ApiResponse<Product>> {
    return this.findOneProductUC.execute(id);
  }

  async findBySlug(slug: string): Promise<ApiResponse<Product>> {
    return this.findBySlugUC.execute(slug);
  }

  async getFeatured(limit: number = 10): Promise<ApiResponse<Product[]>> {
    return this.getFeaturedProductsUC.execute(limit);
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<ApiResponse<Product>> {
    return this.updateProductUC.execute(id, updateProductDto);
  }

  async updateInventory(id: number, quantity: number): Promise<ApiResponse<Product>> {
    return this.updateInventoryUC.execute(id, quantity);
  }

  async remove(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.removeProductUC.execute(id);
  }
}
