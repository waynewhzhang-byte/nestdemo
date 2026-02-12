import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';

export enum ReservationStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  CANCELLED = 'CANCELLED',
  FULFILLED = 'FULFILLED',
  EXPIRED = 'EXPIRED',
}

export class CreateReservationDto {
  @ApiProperty({ description: 'Book ID to reserve' })
  @IsString()
  @IsNotEmpty()
  bookId: string;
}

export class QueryReservationsDto {
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

  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({ description: 'Filter by book ID' })
  @IsOptional()
  @IsString()
  bookId?: string;
}

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
