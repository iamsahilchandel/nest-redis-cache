import { pgTable, serial, varchar, timestamp, boolean, text, integer, decimal, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './user.schema';

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 500 }),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
    costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
    sku: varchar('sku', { length: 100 }).unique(),
    barcode: varchar('barcode', { length: 100 }),
    quantity: integer('quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').default(10),
    trackInventory: boolean('track_inventory').notNull().default(true),
    allowBackorder: boolean('allow_backorder').notNull().default(false),
    weight: decimal('weight', { precision: 10, scale: 2 }),
    weightUnit: varchar('weight_unit', { length: 10 }).default('kg'),
    categoryId: integer('category_id'),
    brandId: integer('brand_id'),
    sellerId: integer('seller_id').references(() => users.id),
    status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, active, archived
    isFeatured: boolean('is_featured').notNull().default(false),
    isDigital: boolean('is_digital').notNull().default(false),
    imageUrl: varchar('image_url', { length: 500 }),
    images: text('images'), // JSON array of image URLs
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: varchar('meta_description', { length: 500 }),
    tags: text('tags'), // JSON array of tags
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('idx_products_name').on(table.name),
    slugIdx: index('idx_products_slug').on(table.slug),
    skuIdx: index('idx_products_sku').on(table.sku),
    statusIdx: index('idx_products_status').on(table.status),
    categoryIdx: index('idx_products_category').on(table.categoryId),
    brandIdx: index('idx_products_brand').on(table.brandId),
    sellerIdx: index('idx_products_seller').on(table.sellerId),
    featuredIdx: index('idx_products_featured').on(table.isFeatured),
    priceIdx: index('idx_products_price').on(table.price),
    createdAtIdx: index('idx_products_created_at').on(table.createdAt),
  }),
);

// Relations
export const productsRelations = relations(products, ({ one }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);

// Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
