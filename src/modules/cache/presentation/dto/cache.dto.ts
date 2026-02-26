import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Zod Schemas
// ============================================================================

export const InvalidateKeyDtoSchema = z.object({
  key: z.string().min(1),
});

export const InvalidateTagDtoSchema = z.object({
  tag: z.string().min(1),
});

export const InvalidatePrefixDtoSchema = z.object({
  prefix: z.string().min(1),
});

export const InvalidateManyDtoSchema = z.object({
  keys: z.array(z.string().min(1)).min(1),
});

// ============================================================================
// TypeScript types
// ============================================================================

export type InvalidateKeyDto = z.infer<typeof InvalidateKeyDtoSchema>;
export type InvalidateTagDto = z.infer<typeof InvalidateTagDtoSchema>;
export type InvalidatePrefixDto = z.infer<typeof InvalidatePrefixDtoSchema>;
export type InvalidateManyDto = z.infer<typeof InvalidateManyDtoSchema>;

// ============================================================================
// Swagger DTOs
// ============================================================================

export class InvalidateKeyDtoSwagger {
  @ApiProperty({ description: 'Cache key to invalidate', example: 'products:id:1' })
  key!: string;
}

export class InvalidateTagDtoSwagger {
  @ApiProperty({ description: 'Cache tag to invalidate', example: 'tag:products:list' })
  tag!: string;
}

export class InvalidatePrefixDtoSwagger {
  @ApiProperty({ description: 'Cache key prefix to invalidate', example: 'products' })
  prefix!: string;
}

export class InvalidateManyDtoSwagger {
  @ApiProperty({
    description: 'Array of cache keys or tags to invalidate. Tags should start with "tag:"',
    type: [String],
    example: ['products:id:1', 'tag:products:list'],
  })
  keys!: string[];
}

export class ListKeysQuerySwagger {
  @ApiPropertyOptional({
    description: 'Glob pattern to filter keys',
    example: 'products:*',
    default: '*',
  })
  pattern?: string;

  @ApiPropertyOptional({
    description: 'Max number of keys to return',
    example: 50,
    default: 100,
  })
  limit?: number;
}
