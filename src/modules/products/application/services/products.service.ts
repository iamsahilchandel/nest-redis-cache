import { Injectable } from '@nestjs/common';
import type { Product } from '@/infrastructure/database/schemas/product.schema';
import type { ApiResponse } from '@/shared/helpers/api-response';
import type { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../../presentation/dto/product.dto';
import {
  CreateProductUseCase,
  FindAllProductsUseCase,
  PaginatedProducts,
  FindOneProductUseCase,
  FindBySlugUseCase,
  GetFeaturedProductsUseCase,
  UpdateProductUseCase,
  UpdateInventoryUseCase,
  RemoveProductUseCase,
} from '../use-cases';

export type { PaginatedProducts };

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
