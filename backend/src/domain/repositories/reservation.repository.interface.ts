import { Reservation } from "../entities/reservation.entity";

export interface IReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  findByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ reservations: Reservation[]; total: number }>;
  findByBookId(bookId: string): Promise<Reservation[]>;
  findActiveByBookId(bookId: string): Promise<Reservation[]>;
  findActiveByUserId(userId: string): Promise<Reservation | null>;
  findExpired(): Promise<Reservation[]>;
  findAll(options?: {
    status?: string;
    bookId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reservations: Reservation[]; total: number }>;
  save(reservation: Reservation): Promise<Reservation>;
  update(reservation: Reservation): Promise<Reservation>;
  getQueuePosition(bookId: string, userId: string): Promise<{ position: number; total: number } | null>;
}
