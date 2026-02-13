import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
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
import { BorrowingsService } from "./borrowings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  BorrowBookDto,
  ReturnBookDto,
  RenewBorrowingDto,
  QueryBorrowingsDto,
} from "./dto/borrowings.dto";
import { UserRole } from "../auth/dto/auth.dto";
import { Role } from "@prisma/client";

@ApiTags("Borrowings")
@Controller("borrowings")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BorrowingsController {
  constructor(private readonly borrowingsService: BorrowingsService) {}

  @Post("borrow")
  @ApiOperation({ summary: "Borrow a book" })
  async borrowBook(
    @CurrentUser("id") userId: string,
    @Body() dto: BorrowBookDto,
  ) {
    return this.borrowingsService.borrowBook(userId, dto);
  }

  @Post("return")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Return a borrowed book" })
  async returnBook(
    @CurrentUser("id") userId: string,
    @Body() dto: ReturnBookDto,
  ) {
    return this.borrowingsService.returnBook(userId, dto);
  }

  @Post("renew")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renew a borrowing" })
  async renewBorrowing(
    @CurrentUser("id") userId: string,
    @Body() dto: RenewBorrowingDto,
  ) {
    return this.borrowingsService.renewBorrowing(userId, dto);
  }

  @Get("my")
  @ApiOperation({ summary: "Get current user borrowings" })
  async getMyBorrowings(
    @CurrentUser("id") userId: string,
    @Query() query: QueryBorrowingsDto,
  ) {
    return this.borrowingsService.getMyBorrowings(userId, query);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Get all borrowings (Admin/Teacher only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "userId", required: false, type: String })
  async getAllBorrowings(@Query() query: QueryBorrowingsDto) {
    return this.borrowingsService.getAllBorrowings(query);
  }

  @Get("overdue")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Get overdue borrowings (Admin/Teacher only)" })
  async getOverdueBorrowings() {
    return this.borrowingsService.getOverdueBorrowings();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get borrowing by ID" })
  async getBorrowingById(
    @Param("id") borrowingId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") userRole: string,
  ) {
    return this.borrowingsService.getBorrowingById(
      borrowingId,
      userId,
      userRole as Role,
    );
  }

  @Post("mark-overdue")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all overdue borrowings (Admin only)" })
  async markOverdueBorrowings() {
    return this.borrowingsService.markOverdueBorrowings();
  }
}
