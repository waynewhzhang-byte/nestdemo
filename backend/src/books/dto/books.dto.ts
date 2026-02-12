import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';

export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  LOST = 'LOST',
}

export class CreateBookDto {
  @ApiProperty({ example: '978-3-16-148410-0' })
  @IsString()
  @IsNotEmpty()
  isbn: string;

  @ApiProperty({ example: 'The Great Gatsby' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'F. Scott Fitzgerald' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author: string;

  @ApiProperty({ example: 'Scribner' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  publisher: string;

  @ApiProperty({ example: 1925 })
  @IsNumber()
  @Min(1000)
  publishedYear: number;

  @ApiProperty({ example: 'Fiction' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ example: 'A classic American novel...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: 'A-101' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  location?: string;

  @ApiPropertyOptional({ example: 5, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalCopies?: number;
}

export class UpdateBookDto extends PartialType(CreateBookDto) {
  @ApiPropertyOptional({ enum: BookStatus })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  availableCopies?: number;
}

export class QueryBooksDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by title or author' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: BookStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @ApiPropertyOptional({ description: 'Filter by ISBN' })
  @IsOptional()
  @IsString()
  isbn?: string;
}

export class AdjustInventoryDto {
  @ApiProperty({ example: 2, description: 'Number of copies to add (positive) or remove (negative)' })
  @IsNumber()
  adjustment: number;
}
