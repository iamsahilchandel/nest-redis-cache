import { BaseEntity } from '../../../../shared/domain/base.entity';
import { Money, Slug } from '../value-objects';

export type ProductStatus = 'draft' | 'active' | 'archived';

export interface ProductProps {
  id: number;
  name: string;
  slug: Slug;
  description: string | null;
  shortDescription: string | null;
  price: Money;
  compareAtPrice: Money | null;
  costPrice: Money | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  lowStockThreshold: number | null;
  trackInventory: boolean;
  allowBackorder: boolean;
  weight: string | null;
  weightUnit: string | null;
  categoryId: number | null;
  brandId: number | null;
  sellerId: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  isDigital: boolean;
  imageUrl: string | null;
  images: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProductEntity - Core domain model for products.
 *
 * Contains business logic and invariants. Independent of database
 * and framework concerns. ORM types never leak into this class.
 */
export class ProductEntity extends BaseEntity<number> {
  public name: string;
  public slug: Slug;
  public description: string | null;
  public shortDescription: string | null;
  public price: Money;
  public compareAtPrice: Money | null;
  public costPrice: Money | null;
  public sku: string | null;
  public barcode: string | null;
  public quantity: number;
  public lowStockThreshold: number | null;
  public trackInventory: boolean;
  public allowBackorder: boolean;
  public weight: string | null;
  public weightUnit: string | null;
  public categoryId: number | null;
  public brandId: number | null;
  public sellerId: number | null;
  public status: ProductStatus;
  public isFeatured: boolean;
  public isDigital: boolean;
  public imageUrl: string | null;
  public images: string | null;
  public metaTitle: string | null;
  public metaDescription: string | null;
  public tags: string | null;

  private constructor(props: ProductProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.name = props.name;
    this.slug = props.slug;
    this.description = props.description;
    this.shortDescription = props.shortDescription;
    this.price = props.price;
    this.compareAtPrice = props.compareAtPrice;
    this.costPrice = props.costPrice;
    this.sku = props.sku;
    this.barcode = props.barcode;
    this.quantity = props.quantity;
    this.lowStockThreshold = props.lowStockThreshold;
    this.trackInventory = props.trackInventory;
    this.allowBackorder = props.allowBackorder;
    this.weight = props.weight;
    this.weightUnit = props.weightUnit;
    this.categoryId = props.categoryId;
    this.brandId = props.brandId;
    this.sellerId = props.sellerId;
    this.status = props.status;
    this.isFeatured = props.isFeatured;
    this.isDigital = props.isDigital;
    this.imageUrl = props.imageUrl;
    this.images = props.images;
    this.metaTitle = props.metaTitle;
    this.metaDescription = props.metaDescription;
    this.tags = props.tags;
  }

  static create(props: ProductProps): ProductEntity {
    return new ProductEntity(props);
  }

  updateDetails(
    updates: Partial<
      Pick<
        ProductProps,
        | 'name'
        | 'description'
        | 'shortDescription'
        | 'sku'
        | 'barcode'
        | 'weight'
        | 'weightUnit'
        | 'categoryId'
        | 'brandId'
        | 'status'
        | 'isFeatured'
        | 'isDigital'
        | 'imageUrl'
        | 'images'
        | 'metaTitle'
        | 'metaDescription'
        | 'tags'
        | 'trackInventory'
        | 'allowBackorder'
        | 'lowStockThreshold'
      >
    > & { price?: Money; compareAtPrice?: Money; costPrice?: Money; slug?: Slug },
  ): void {
    Object.assign(this, updates);
    this.touch();
  }

  updateInventory(quantity: number): void {
    this.quantity = quantity;
    this.touch();
  }

  isLowStock(): boolean {
    if (!this.trackInventory) return false;
    return this.quantity <= (this.lowStockThreshold ?? 10);
  }

  archive(): void {
    this.status = 'archived';
    this.touch();
  }

  activate(): void {
    this.status = 'active';
    this.touch();
  }
}
