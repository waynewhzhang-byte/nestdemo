import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  Borrowing,
  BorrowingProps,
} from "../../domain/entities/borrowing.entity";
import { IBorrowingRepository } from "../../domain/repositories/borrowing.repository.interface";
import { BorrowingStatus } from "@prisma/client";

@Injectable()
export class PrismaBorrowingRepository implements IBorrowingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(data: any): Borrowing {
    const props: BorrowingProps = {
      id: data.id,
      userId: data.userId,
      bookId: data.bookId,
      borrowedAt: data.borrowedAt,
      dueDate: data.dueDate,
      returnedAt: data.returnedAt,
      status: data.status as BorrowingStatus,
      renewedCount: data.renewedCount,
      maxRenewals: data.maxRenewals,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    return new Borrowing(props);
  }

  async findById(id: string): Promise<Borrowing | null> {
    const borrowing = await this.prisma.borrowing.findUnique({ where: { id } });
    return borrowing ? this.toEntity(borrowing) : null;
  }

  async findByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ borrowings: Borrowing[]; total: number }> {
    const where: any = { userId };
    if (options?.status) where.status = options.status;

    const [borrowings, total] = await Promise.all([
      this.prisma.borrowing.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
        include: { book: true },
      }),
      this.prisma.borrowing.count({ where }),
    ]);

    return { borrowings: borrowings.map((b) => this.toEntity(b)), total };
  }

  async findByBookId(bookId: string): Promise<Borrowing[]> {
    const borrowings = await this.prisma.borrowing.findMany({
      where: { bookId },
    });
    return borrowings.map((b) => this.toEntity(b));
  }

  async findActiveByUserId(userId: string): Promise<Borrowing[]> {
    const borrowings = await this.prisma.borrowing.findMany({
      where: { userId, status: BorrowingStatus.ACTIVE },
    });
    return borrowings.map((b) => this.toEntity(b));
  }

  async findActiveByBookId(bookId: string): Promise<Borrowing | null> {
    const borrowing = await this.prisma.borrowing.findFirst({
      where: { bookId, status: BorrowingStatus.ACTIVE },
    });
    return borrowing ? this.toEntity(borrowing) : null;
  }

  async findOverdue(): Promise<Borrowing[]> {
    const borrowings = await this.prisma.borrowing.findMany({
      where: { status: BorrowingStatus.ACTIVE, dueDate: { lt: new Date() } },
    });
    return borrowings.map((b) => this.toEntity(b));
  }

  async save(borrowing: Borrowing): Promise<Borrowing> {
    const data = borrowing.toJSON();
    const created = await this.prisma.borrowing.create({ data });
    return this.toEntity(created);
  }

  async update(borrowing: Borrowing): Promise<Borrowing> {
    const data = borrowing.toJSON();
    const updated = await this.prisma.borrowing.update({
      where: { id: borrowing.id },
      data,
    });
    return this.toEntity(updated);
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.prisma.borrowing.count({
      where: { userId, status: BorrowingStatus.ACTIVE },
    });
  }
}
