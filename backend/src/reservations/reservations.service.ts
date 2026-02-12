import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReservationDto,
  QueryReservationsDto,
  UpdateReservationStatusDto,
  ReservationStatus,
} from './dto/reservations.dto';

const RESERVATION_EXPIRY_DAYS = 7;
const PICKUP_DEADLINE_DAYS = 3;

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReservationDto) {
    return this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: dto.bookId },
        include: {
          reservations: {
            where: { status: { in: ['PENDING', 'READY'] } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!book) {
        throw new NotFoundException('Book not found');
      }

      if (book.availableCopies > 0) {
        throw new BadRequestException(
          'This book is currently available. You can borrow it directly.',
        );
      }

      const existingReservation = await tx.reservation.findFirst({
        where: {
          userId,
          bookId: dto.bookId,
          status: { in: ['PENDING', 'READY'] },
        },
      });

      if (existingReservation) {
        throw new ConflictException('You already have an active reservation for this book');
      }

      const activeBorrowing = await tx.borrowing.findFirst({
        where: {
          userId,
          bookId: dto.bookId,
          status: 'ACTIVE',
        },
      });

      if (activeBorrowing) {
        throw new BadRequestException('You are currently borrowing this book');
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + RESERVATION_EXPIRY_DAYS);

      const reservation = await tx.reservation.create({
        data: {
          userId,
          bookId: dto.bookId,
          status: ReservationStatus.PENDING,
          expiresAt,
        },
        include: {
          book: { select: { id: true, title: true, author: true } },
        },
      });

      return {
        ...reservation,
        queuePosition: book.reservations.length + 1,
      };
    });
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
        orderBy: { createdAt: 'desc' },
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
        orderBy: { createdAt: 'desc' },
        include: {
          book: { select: { id: true, title: true, author: true, isbn: true, coverImage: true } },
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
      throw new NotFoundException('Reservation not found');
    }

    if (!isAdmin && reservation.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this reservation');
    }

    return reservation;
  }

  async cancel(userId: string, reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      if (reservation.userId !== userId) {
        throw new ForbiddenException('You can only cancel your own reservations');
      }

      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('Reservation is already cancelled');
      }

      if (reservation.status === ReservationStatus.FULFILLED) {
        throw new BadRequestException('Cannot cancel a fulfilled reservation');
      }

      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
        include: {
          book: { select: { id: true, title: true, author: true } },
        },
      });

      return updatedReservation;
    });
  }

  async markReady(reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException('Only pending reservations can be marked as ready');
      }

      const pickupDeadline = new Date();
      pickupDeadline.setDate(pickupDeadline.getDate() + PICKUP_DEADLINE_DAYS);

      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.READY,
          notifiedAt: new Date(),
          expiresAt: pickupDeadline,
        },
        include: {
          book: { select: { id: true, title: true, author: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return updatedReservation;
    });
  }

  async fulfill(reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      if (reservation.status !== ReservationStatus.READY) {
        throw new BadRequestException('Only ready reservations can be fulfilled');
      }

      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.FULFILLED,
          fulfilledAt: new Date(),
        },
      });

      return updatedReservation;
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleReservationExpiry() {
    this.logger.log('Checking for expired reservations...');
    const result = await this.expireOverdueReservations();
    if (result.count > 0) {
      this.logger.log(result.message);
    }
  }

  async expireOverdueReservations() {
    const now = new Date();

    const result = await this.prisma.reservation.updateMany({
      where: {
        status: { in: ['PENDING', 'READY'] },
        expiresAt: { lt: now },
      },
      data: { status: ReservationStatus.EXPIRED },
    });

    return {
      message: `Expired ${result.count} reservation(s)`,
      count: result.count,
    };
  }

  async getQueuePosition(bookId: string, userId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        bookId,
        status: { in: ['PENDING', 'READY'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, userId: true },
    });

    const position = reservations.findIndex((r) => r.userId === userId) + 1;

    if (position === 0) {
      return { hasReservation: false, position: null };
    }

    return {
      hasReservation: true,
      position,
      totalInQueue: reservations.length,
    };
  }
}
