import { Injectable } from "@nestjs/common";
import { Borrowing, BorrowingProps } from "../entities/borrowing.entity";
import { DueDate } from "../value-objects";
import { Role, BorrowingStatus } from "@prisma/client";
import { PrismaBorrowingRepository } from "../../infrastructure/repositories/prisma-borrowing.repository";
import { PrismaBookRepository } from "../../infrastructure/repositories/prisma-book.repository";
import { PrismaUserRepository } from "../../infrastructure/repositories/prisma-user.repository";
import { PrismaService } from "../../prisma/prisma.service";
import { BORROWING_LIMITS, FINE_PER_DAY } from "../../constants";

export interface BorrowBookParams {
  userId: string;
  bookId: string;
  borrowDays?: number;
}

export interface ReturnBookParams {
  borrowingId: string;
  userId: string;
}

export interface RenewBookParams {
  borrowingId: string;
  userId: string;
}

@Injectable()
export class BorrowingDomainService {
  constructor(
    private readonly borrowingRepo: PrismaBorrowingRepository,
    private readonly bookRepo: PrismaBookRepository,
    private readonly userRepo: PrismaUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async borrowBook(
    params: BorrowBookParams,
  ): Promise<{ borrowing: Borrowing; message: string }> {
    // Pre-transaction validation (read-only checks)
    const user = await this.userRepo.findById(params.userId);
    if (!user || !user.isActive) {
      throw new Error("User account is not active");
    }

    const limits =
      BORROWING_LIMITS[user.role as keyof typeof BORROWING_LIMITS] ??
      BORROWING_LIMITS.STUDENT;

    const activeCount = await this.borrowingRepo.countActiveByUserId(
      params.userId,
    );
    if (activeCount >= limits.maxBooks) {
      throw new Error(
        `You have reached the maximum borrowing limit (${limits.maxBooks} books)`,
      );
    }

    const book = await this.bookRepo.findById(params.bookId);
    if (!book) {
      throw new Error("Book not found");
    }
    if (!book.canBeBorrowed()) {
      throw new Error("This book is not available for borrowing");
    }

    const existingBorrowing = await this.borrowingRepo.findActiveByBookId(
      params.bookId,
    );
    if (existingBorrowing && existingBorrowing.userId === params.userId) {
      throw new Error("You have already borrowed this book");
    }

    const borrowDays = params.borrowDays || limits.maxDays;
    const dueDate = DueDate.create(borrowDays);
    const borrowingId = crypto.randomUUID();
    const now = new Date();

    // Atomic write: decrement copies + create borrowing record
    const borrowingRecord = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.book.updateMany({
        where: { id: params.bookId, availableCopies: { gt: 0 } },
        data: { availableCopies: { decrement: 1 } },
      });

      if (updateResult.count === 0) {
        throw new Error("No available copies of this book");
      }

      return tx.borrowing.create({
        data: {
          id: borrowingId,
          userId: params.userId,
          bookId: params.bookId,
          borrowedAt: now,
          dueDate: dueDate.getValue(),
          status: BorrowingStatus.ACTIVE,
          renewedCount: 0,
          maxRenewals: limits.maxRenewals,
        },
      });
    });

    const borrowingProps: BorrowingProps = {
      id: borrowingRecord.id,
      userId: borrowingRecord.userId,
      bookId: borrowingRecord.bookId,
      borrowedAt: borrowingRecord.borrowedAt,
      dueDate: borrowingRecord.dueDate,
      status: borrowingRecord.status as BorrowingStatus,
      renewedCount: borrowingRecord.renewedCount,
      maxRenewals: borrowingRecord.maxRenewals,
      createdAt: borrowingRecord.createdAt,
      updatedAt: borrowingRecord.updatedAt,
    };

    return {
      borrowing: new Borrowing(borrowingProps),
      message: "Book borrowed successfully",
    };
  }

  async returnBook(
    params: ReturnBookParams,
  ): Promise<{ borrowing: Borrowing; message: string }> {
    const borrowing = await this.borrowingRepo.findById(params.borrowingId);
    if (!borrowing) {
      throw new Error("Borrowing record not found");
    }

    const user = await this.userRepo.findById(params.userId);
    if (borrowing.userId !== params.userId && user?.role !== Role.ADMIN) {
      throw new Error("You can only return your own borrowed books");
    }

    if (borrowing.isReturned()) {
      throw new Error("This book has already been returned");
    }

    const isOverdue = borrowing.isOverdue();
    const returnedAt = new Date();

    // Atomic write: update borrowing status + restore book copy
    await this.prisma.$transaction(async (tx) => {
      await tx.borrowing.update({
        where: { id: params.borrowingId },
        data: { status: BorrowingStatus.RETURNED, returnedAt },
      });

      await tx.book.update({
        where: { id: borrowing.bookId },
        data: {
          availableCopies: { increment: 1 },
          status: "AVAILABLE",
        },
      });
    });

    // Update in-memory entity for response
    borrowing.return();

    if (isOverdue) {
      const daysOverdue = borrowing.getDaysOverdue();
      // fine metadata for caller; caller is responsible for creating Fine record
      void { amount: daysOverdue * FINE_PER_DAY, reason: `Overdue by ${daysOverdue} day(s)` };
    }

    return {
      borrowing,
      message: isOverdue
        ? "Book returned. Please note: You have an overdue fine."
        : "Book returned successfully",
    };
  }

  async renewBook(
    params: RenewBookParams,
  ): Promise<{ borrowing: Borrowing; message: string }> {
    const borrowing = await this.borrowingRepo.findById(params.borrowingId);
    if (!borrowing) {
      throw new Error("Borrowing record not found");
    }

    const user = await this.userRepo.findById(params.userId);
    if (borrowing.userId !== params.userId && user?.role !== Role.ADMIN) {
      throw new Error("You can only renew your own borrowed books");
    }

    if (!borrowing.canRenew(user?.role || Role.STUDENT)) {
      throw new Error("This borrowing cannot be renewed");
    }

    const limits =
      BORROWING_LIMITS[user?.role as keyof typeof BORROWING_LIMITS] ??
      BORROWING_LIMITS.STUDENT;
    const renewalDays = limits.maxDays;
    const newDueDate = DueDate.create(renewalDays);
    borrowing.renew(newDueDate.getValue());
    const updated = await this.borrowingRepo.update(borrowing);

    return { borrowing: updated, message: "Borrowing renewed successfully" };
  }
}
