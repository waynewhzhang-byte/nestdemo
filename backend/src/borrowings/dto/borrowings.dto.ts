import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class BorrowBookDto {
  @ApiProperty({ description: 'Book ID to borrow', example: 'uuid-string' })
  @IsString()
  @IsNotEmpty()
  bookId: string;
}

export class ReturnBookDto {
  @ApiProperty({ description: 'Borrowing ID to return', example: 'uuid-string' })
  @IsString()
  @IsNotEmpty()
  borrowingId: string;
}

export class RenewBorrowingDto {
  @ApiProperty({ description: 'Borrowing ID to renew', example: 'uuid-string' })
  @IsString()
  @IsNotEmpty()
  borrowingId: string;
}

export class QueryBorrowingsDto {
  @ApiProperty({ description: 'Page number', default: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', default: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ description: 'Filter by status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Filter by user ID (admin only)', required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}
