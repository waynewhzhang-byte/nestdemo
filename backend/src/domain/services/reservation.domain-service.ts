import { Injectable, Inject } from "@nestjs/common";
import { Reservation, ReservationProps } from "../entities/reservation.entity";
import { IReservationRepository } from "../repositories/reservation.repository.interface";
import { RESERVATION_REPOSITORY, BOOK_REPOSITORY } from "../repositories/tokens";
import { IBookRepository } from "../repositories/book.repository.interface";
import { ReservationStatus } from "../enums";

export interface CreateReservationParams {
  userId: string;
  bookId: string;
}

const RESERVATION_EXPIRY_DAYS = 7;
const PICKUP_DEADLINE_DAYS = 3;

@Injectable()
export class ReservationDomainService {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: IReservationRepository,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: IBookRepository,
  ) {}

  async createReservation(
    params: CreateReservationParams,
  ): Promise<{ reservation: Reservation; queuePosition: number; message: string }> {
    const book = await this.bookRepo.findById(params.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    if (book.availableCopies > 0) {
      throw new Error(
        "This book is currently available. You can borrow it directly.",
      );
    }

    const existingReservation = await this.reservationRepo.findActiveByUserId(
      params.userId,
    );
    if (existingReservation) {
      throw new Error("You already have an active reservation for this book");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + RESERVATION_EXPIRY_DAYS);

    const reservationProps: ReservationProps = {
      id: crypto.randomUUID(),
      userId: params.userId,
      bookId: params.bookId,
      status: ReservationStatus.PENDING,
      createdAt: new Date(),
      expiresAt,
    };

    const reservation = new Reservation(reservationProps);
    const saved = await this.reservationRepo.save(reservation);

    const queueInfo = await this.reservationRepo.getQueuePosition(
      params.bookId,
      params.userId,
    );

    return {
      reservation: saved,
      queuePosition: queueInfo?.position || 1,
      message: "Reservation created successfully",
    };
  }

  async cancelReservation(
    reservationId: string,
    userId: string,
  ): Promise<{ reservation: Reservation; message: string }> {
    const reservation = await this.reservationRepo.findById(reservationId);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.userId !== userId) {
      throw new Error("You can only cancel your own reservations");
    }

    if (reservation.isFulfilled()) {
      throw new Error("Cannot cancel a fulfilled reservation");
    }

    reservation.cancel();
    const updated = await this.reservationRepo.update(reservation);

    return {
      reservation: updated,
      message: "Reservation cancelled successfully",
    };
  }

  async markReady(
    reservationId: string,
  ): Promise<{ reservation: Reservation; message: string }> {
    const reservation = await this.reservationRepo.findById(reservationId);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (!reservation.isPending()) {
      throw new Error("Only pending reservations can be marked as ready");
    }

    const pickupDeadline = new Date();
    pickupDeadline.setDate(pickupDeadline.getDate() + PICKUP_DEADLINE_DAYS);

    reservation.markReady();
    reservation.extendExpiry(pickupDeadline);

    const updated = await this.reservationRepo.update(reservation);

    return {
      reservation: updated,
      message: "Reservation marked as ready for pickup",
    };
  }

  async fulfillReservation(
    reservationId: string,
  ): Promise<{ reservation: Reservation; message: string }> {
    const reservation = await this.reservationRepo.findById(reservationId);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (!reservation.isReady()) {
      throw new Error("Only ready reservations can be fulfilled");
    }

    reservation.fulfill();
    const updated = await this.reservationRepo.update(reservation);

    return {
      reservation: updated,
      message: "Reservation fulfilled successfully",
    };
  }

  async expireOverdueReservations(): Promise<{ count: number }> {
    const expired = await this.reservationRepo.findExpired();

    for (const reservation of expired) {
      reservation.expire();
      await this.reservationRepo.update(reservation);
    }

    return { count: expired.length };
  }

  async getQueuePosition(
    bookId: string,
    userId: string,
  ): Promise<{ hasReservation: boolean; position: number | null; total: number | null }> {
    const queueInfo = await this.reservationRepo.getQueuePosition(bookId, userId);

    if (!queueInfo) {
      return { hasReservation: false, position: null, total: null };
    }

    return {
      hasReservation: true,
      position: queueInfo.position,
      total: queueInfo.total,
    };
  }
}
