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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/dto/auth.dto';
import {
  CreateReservationDto,
  QueryReservationsDto,
} from './dto/reservations.dto';

@ApiTags('Reservations')
@Controller('reservations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reservation for a book' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.create(userId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user reservations' })
  async getMyReservations(
    @CurrentUser('id') userId: string,
    @Query() query: QueryReservationsDto,
  ) {
    return this.reservationsService.getMyReservations(userId, query);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all reservations (Admin/Teacher only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'bookId', required: false, type: String })
  async findAll(@Query() query: QueryReservationsDto) {
    return this.reservationsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.TEACHER;
    return this.reservationsService.findOne(id, userId, isAdmin);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a reservation' })
  async cancel(
    @CurrentUser('id') userId: string,
    @Param('id') reservationId: string,
  ) {
    return this.reservationsService.cancel(userId, reservationId);
  }

  @Post(':id/ready')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark reservation as ready for pickup (Admin/Teacher only)' })
  async markReady(@Param('id') reservationId: string) {
    return this.reservationsService.markReady(reservationId);
  }

  @Post(':id/fulfill')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fulfill a reservation (Admin/Teacher only)' })
  async fulfill(@Param('id') reservationId: string) {
    return this.reservationsService.fulfill(reservationId);
  }

  @Post('expire-overdue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expire overdue reservations (Admin only)' })
  async expireOverdue() {
    return this.reservationsService.expireOverdueReservations();
  }

  @Get('queue/:bookId')
  @ApiOperation({ summary: 'Get queue position for a book' })
  async getQueuePosition(
    @Param('bookId') bookId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reservationsService.getQueuePosition(bookId, userId);
  }
}
