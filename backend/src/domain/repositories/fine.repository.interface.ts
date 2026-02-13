import { Fine } from "../entities/fine.entity";

export interface IFineRepository {
  findById(id: string): Promise<Fine | null>;
  findByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ fines: Fine[]; total: number }>;
  findByBorrowingId(borrowingId: string): Promise<Fine[]>;
  findAll(options?: {
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ fines: Fine[]; total: number }>;
  save(fine: Fine): Promise<Fine>;
  update(fine: Fine): Promise<Fine>;
  getTotalUnpaidByUserId(userId: string): Promise<number>;
}
