import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { StatisticsService } from "./statistics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/dto/auth.dto";
import { StatisticsQueryDto } from "./dto/statistics.dto";

@ApiTags("Statistics")
@Controller("statistics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get dashboard overview statistics" })
  async getDashboardOverview(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getDashboardOverview(query);
  }

  @Get("borrowings")
  @ApiOperation({ summary: "Get borrowing statistics" })
  async getBorrowingStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getBorrowingStatistics(query);
  }

  @Get("books")
  @ApiOperation({ summary: "Get book statistics" })
  async getBookStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getBookStatistics(query);
  }

  @Get("users")
  @ApiOperation({ summary: "Get user statistics" })
  async getUserStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getUserStatistics(query);
  }

  @Get("fines")
  @ApiOperation({ summary: "Get fine statistics" })
  async getFineStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getFineStatistics(query);
  }

  @Get("trends")
  @ApiOperation({ summary: "Get monthly trends (last 6 months)" })
  async getMonthlyTrends() {
    return this.statisticsService.getMonthlyTrends();
  }
}
