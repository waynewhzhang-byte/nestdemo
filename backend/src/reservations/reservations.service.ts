import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { ReservationDomainService } from "../domain/services/reservation.domain-service";
import {
  CreateReservationDto,
  QueryReservationsDto,
} from "./dto/reservations.dto";

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private prisma: PrismaService,
    private reservationDomainService: ReservationDomainService,
  ) {}

  async create(userId: string, dto: CreateReservationDto) {
    const result = await this.reservationDomainService.createReservation({
      userId,
      bookId: dto.bookId,
    });

    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
      select: { id: true, title: true, author: true },
    });

    return {
      ...result.reservation.toJSON(),
      book,
      queuePosition: result.queuePosition,
    };
  }

  async findAll(query: QueryReservationsDto) {
    const { page = 1, limit = 10, status, bookId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (bookId) {
      where.bookId = bookId;
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          book: { select: { id: true, title: true, author: true, isbn: true } },
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyReservations(userId: string, query: QueryReservationsDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              isbn: true,
              coverImage: true,
            },
          },
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string, isAdmin: boolean) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        book: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    if (!isAdmin && reservation.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to view this reservation",
      );
    }

    return reservation;
  }

  async cancel(userId: string, reservationId: string) {
    await this.reservationDomainService.cancelReservation(reservationId, userId);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        book: { select: { id: true, title: true, author: true } },
      },
    });

    return reservation;
  }

  async markReady(reservationId: string) {
    await this.reservationDomainService.markReady(reservationId);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        book: { select: { id: true, title: true, author: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return reservation;
  }

  async fulfill(reservationId: string) {
    await this.reservationDomainService.fulfillReservation(reservationId);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    return reservation;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleReservationExpiry() {
    this.logger.log("Checking for expired reservations...");
    const result = await this.reservationDomainService.expireOverdueReservations();
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} reservation(s)`);
    }
  }

  async getQueuePosition(bookId: string, userId: string) {
    return this.reservationDomainService.getQueuePosition(bookId, userId);
  }

  async expireOverdueReservations() {
    return this.reservationDomainService.expireOverdueReservations();
  }
}
