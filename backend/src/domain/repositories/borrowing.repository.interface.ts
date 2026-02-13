import { Borrowing } from "../entities/borrowing.entity";

export interface IBorrowingRepository {
  findById(id: string): Promise<Borrowing | null>;
  findByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ borrowings: Borrowing[]; total: number }>;
  findByBookId(bookId: string): Promise<Borrowing[]>;
  findActiveByUserId(userId: string): Promise<Borrowing[]>;
  findActiveByBookId(bookId: string): Promise<Borrowing | null>;
  findOverdue(): Promise<Borrowing[]>;
  save(borrowing: Borrowing): Promise<Borrowing>;
  update(borrowing: Borrowing): Promise<Borrowing>;
  countActiveByUserId(userId: string): Promise<number>;
}
