import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProductsService, PaginatedProducts } from './products.service';
import {
  CreateProductDtoSchema,
  UpdateProductDtoSchema,
  ProductQueryDtoSchema,
  CreateProductDtoSwagger,
  UpdateProductDtoSwagger,
  ProductQueryDtoSwagger,
} from './dto/product.dto';
import type { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import type { Product } from '../../core/database/schemas/product.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import type { ApiResponse as ApiResponseType } from '../../common/api-response';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductDtoSwagger })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Seller or Admin only' })
  @ApiResponse({ status: 409, description: 'Product with this slug already exists' })
  async create(
    @Body(new ZodValidationPipe(CreateProductDtoSchema)) createProductDto: CreateProductDto,
    @Request() req: { user?: { id: number } },
  ): Promise<ApiResponseType<Product>> {
    const userId = req.user?.id;
    this.logger.log(`Creating product: ${createProductDto.name} by user: ${userId}`);
    return this.productsService.create(createProductDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  @ApiQuery({ type: ProductQueryDtoSwagger })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll(
    @Query(new ZodValidationPipe(ProductQueryDtoSchema)) query: ProductQueryDto,
  ): Promise<ApiResponseType<PaginatedProducts>> {
    this.logger.log(`Fetching products with query: ${JSON.stringify(query)}`);
    return this.productsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of products to return', example: 10 })
  @ApiResponse({ status: 200, description: 'Featured products retrieved' })
  async getFeatured(@Query('limit') limit?: string): Promise<ApiResponseType<Product[]>> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.productsService.getFeatured(limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseType<Product>> {
    this.logger.log(`Fetching product by ID: ${id}`);
    return this.productsService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiParam({ name: 'slug', description: 'Product slug', example: 'wireless-bluetooth-headphones' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySlug(@Param('slug') slug: string): Promise<ApiResponseType<Product>> {
    this.logger.log(`Fetching product by slug: ${slug}`);
    return this.productsService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a product (full update)' })
  @ApiParam({ name: 'id', description: 'Product ID', example: 1 })
  @ApiBody({ type: UpdateProductDtoSwagger })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateProductDtoSchema)) updateProductDto: UpdateProductDto,
  ): Promise<ApiResponseType<Product>> {
    this.logger.log(`Updating product ID: ${id}`);
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Partially update a product' })
  @ApiParam({ name: 'id', description: 'Product ID', example: 1 })
  @ApiBody({ type: UpdateProductDtoSwagger })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async partialUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateProductDtoSchema)) updateProductDto: UpdateProductDto,
  ): Promise<ApiResponseType<Product>> {
    this.logger.log(`Partially updating product ID: ${id}`);
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product inventory quantity' })
  @ApiParam({ name: 'id', description: 'Product ID', example: 1 })
  @ApiBody({ schema: { type: 'object', properties: { quantity: { type: 'number', example: 50 } } } })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateInventory(
    @Param('id', ParseIntPipe) id: number,
    @Body('quantity') quantity: number,
  ): Promise<ApiResponseType<Product>> {
    this.logger.log(`Updating inventory for product ID: ${id} to quantity: ${quantity}`);
    return this.productsService.updateInventory(id, quantity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseType<{ message: string }>> {
    this.logger.log(`Deleting product ID: ${id}`);
    return this.productsService.remove(id);
  }
}
