import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { FinesService } from "./fines.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "../auth/dto/auth.dto";
import { QueryFinesDto, PayFineDto } from "./dto/fines.dto";

@ApiTags("Fines")
@Controller("fines")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinesController {
  constructor(private readonly finesService: FinesService) {}

  @Get("my")
  @ApiOperation({ summary: "Get current user fines" })
  async getMyFines(
    @CurrentUser("id") userId: string,
    @Query() query: QueryFinesDto,
  ) {
    return this.finesService.getMyFines(userId, query);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Get all fines (Admin/Teacher only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "userId", required: false, type: String })
  async findAll(@Query() query: QueryFinesDto) {
    return this.finesService.findAll(query);
  }

  @Get("statistics")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get fine statistics (Admin only)" })
  async getStatistics() {
    return this.finesService.getStatistics();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get fine by ID" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: string,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.TEACHER;
    return this.finesService.findOne(id, userId, isAdmin);
  }

  @Post(":id/pay")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pay a fine" })
  async pay(
    @CurrentUser("id") userId: string,
    @Param("id") fineId: string,
    @Body() dto: PayFineDto,
  ) {
    return this.finesService.pay(userId, fineId, dto);
  }

  @Post(":id/waive")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Waive a fine (Admin only)" })
  async waive(@Param("id") fineId: string, @Body("reason") reason?: string) {
    return this.finesService.waive(fineId, reason);
  }
}
