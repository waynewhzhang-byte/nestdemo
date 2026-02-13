import { Injectable } from "@nestjs/common";
import { Borrowing, BorrowingProps } from "../entities/borrowing.entity";
import { DueDate } from "../value-objects";
import { Role, BorrowingStatus } from "@prisma/client";
import { PrismaBorrowingRepository } from "../../infrastructure/repositories/prisma-borrowing.repository";
import { PrismaBookRepository } from "../../infrastructure/repositories/prisma-book.repository";
import { PrismaUserRepository } from "../../infrastructure/repositories/prisma-user.repository";

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

const BORROWING_LIMITS: Record<Role, number> = {
  [Role.STUDENT]: 3,
  [Role.TEACHER]: 5,
  [Role.ADMIN]: 999,
};

const DEFAULT_BORROW_DAYS = 14;
const RENEWAL_DAYS = 14;
const MAX_RENEWALS = 2;
const OVERDUE_FINE_PER_DAY = 0.5;

@Injectable()
export class BorrowingDomainService {
  constructor(
    private readonly borrowingRepo: PrismaBorrowingRepository,
    private readonly bookRepo: PrismaBookRepository,
    private readonly userRepo: PrismaUserRepository,
  ) {}

  async borrowBook(
    params: BorrowBookParams,
  ): Promise<{ borrowing: Borrowing; message: string }> {
    const user = await this.userRepo.findById(params.userId);
    if (!user || !user.isActive) {
      throw new Error("User account is not active");
    }

    const activeCount = await this.borrowingRepo.countActiveByUserId(
      params.userId,
    );
    const maxBorrowings = BORROWING_LIMITS[user.role];
    if (activeCount >= maxBorrowings) {
      throw new Error(
        `You have reached the maximum borrowing limit (${maxBorrowings} books)`,
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

    const updated = await this.bookRepo.decrementAvailableCopies(params.bookId);
    if (!updated) {
      throw new Error("No available copies of this book");
    }

    const borrowDays = params.borrowDays || DEFAULT_BORROW_DAYS;
    const dueDate = DueDate.create(borrowDays);

    const borrowingProps: BorrowingProps = {
      id: crypto.randomUUID(),
      userId: params.userId,
      bookId: params.bookId,
      borrowedAt: new Date(),
      dueDate: dueDate.getValue(),
      status: BorrowingStatus.ACTIVE,
      renewedCount: 0,
      maxRenewals: MAX_RENEWALS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const borrowing = new Borrowing(borrowingProps);
    const saved = await this.borrowingRepo.save(borrowing);

    return { borrowing: saved, message: "Book borrowed successfully" };
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

    borrowing.return();
    await this.borrowingRepo.update(borrowing);

    await this.bookRepo.incrementAvailableCopies(borrowing.bookId);

    const isOverdue = borrowing.isOverdue();
    let fine = null;
    if (isOverdue) {
      const daysOverdue = borrowing.getDaysOverdue();
      fine = {
        amount: daysOverdue * OVERDUE_FINE_PER_DAY,
        reason: `Overdue by ${daysOverdue} day(s)`,
      };
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

    const newDueDate = DueDate.create(RENEWAL_DAYS);
    borrowing.renew(newDueDate.getValue());
    const updated = await this.borrowingRepo.update(borrowing);

    return { borrowing: updated, message: "Borrowing renewed successfully" };
  }
}
