import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Reservation, ReservationProps } from "../../domain/entities/reservation.entity";
import { IReservationRepository } from "../../domain/repositories/reservation.repository.interface";
import { ReservationStatus } from "@prisma/client";

@Injectable()
export class PrismaReservationRepository implements IReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(data: any): Reservation {
    const props: ReservationProps = {
      id: data.id,
      userId: data.userId,
      bookId: data.bookId,
      status: data.status as ReservationStatus,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      notifiedAt: data.notifiedAt,
      fulfilledAt: data.fulfilledAt,
    };
    return new Reservation(props);
  }

  async findById(id: string): Promise<Reservation | null> {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    return reservation ? this.toEntity(reservation) : null;
  }

  async findByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ reservations: Reservation[]; total: number }> {
    const where: any = { userId };
    if (options?.status) where.status = options.status;

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      reservations: reservations.map((r) => this.toEntity(r)),
      total,
    };
  }

  async findByBookId(bookId: string): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { bookId },
      orderBy: { createdAt: "asc" },
    });
    return reservations.map((r) => this.toEntity(r));
  }

  async findActiveByBookId(bookId: string): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        bookId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.READY] },
      },
      orderBy: { createdAt: "asc" },
    });
    return reservations.map((r) => this.toEntity(r));
  }

  async findActiveByUserId(userId: string): Promise<Reservation | null> {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        userId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.READY] },
      },
    });
    return reservation ? this.toEntity(reservation) : null;
  }

  async findExpired(): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: [ReservationStatus.PENDING, ReservationStatus.READY] },
        expiresAt: { lt: new Date() },
      },
    });
    return reservations.map((r) => this.toEntity(r));
  }

  async findAll(options?: {
    status?: string;
    bookId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reservations: Reservation[]; total: number }> {
    const where: any = {};
    if (options?.status) where.status = options.status;
    if (options?.bookId) where.bookId = options.bookId;

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      reservations: reservations.map((r) => this.toEntity(r)),
      total,
    };
  }

  async save(reservation: Reservation): Promise<Reservation> {
    const data = reservation.toJSON();
    const created = await this.prisma.reservation.create({ data });
    return this.toEntity(created);
  }

  async update(reservation: Reservation): Promise<Reservation> {
    const data = reservation.toJSON();
    const updated = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data,
    });
    return this.toEntity(updated);
  }

  async getQueuePosition(
    bookId: string,
    userId: string,
  ): Promise<{ position: number; total: number } | null> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        bookId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.READY] },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true },
    });

    const position = reservations.findIndex((r) => r.userId === userId) + 1;

    if (position === 0) {
      return null;
    }

    return {
      position,
      total: reservations.length,
    };
  }
}
