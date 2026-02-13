import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  IsPositive,
} from "class-validator";

export enum FineStatus {
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
}

export class QueryFinesDto {
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

  @ApiPropertyOptional({ enum: FineStatus })
  @IsOptional()
  @IsEnum(FineStatus)
  status?: FineStatus;

  @ApiPropertyOptional({ description: "Filter by user ID" })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class PayFineDto {
  @ApiProperty({ description: "Amount to pay", example: 5.0 })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class CreateFineDto {
  @ApiProperty({ description: "Borrowing ID associated with this fine" })
  @IsString()
  @IsNotEmpty()
  borrowingId: string;

  @ApiProperty({ description: "User ID" })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: "Fine amount", example: 3.5 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: "Reason for the fine" })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
