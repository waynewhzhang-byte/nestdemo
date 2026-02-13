import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum } from "class-validator";

export enum TimeRange {
  TODAY = "TODAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
  YEAR = "YEAR",
}

export class StatisticsQueryDto {
  @ApiPropertyOptional({
    enum: TimeRange,
    description: "Time range for statistics",
  })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange;

  @ApiPropertyOptional({ description: "Start date (ISO string)" })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (ISO string)" })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class DateRangeDto {
  startDate: Date;
  endDate: Date;
}
