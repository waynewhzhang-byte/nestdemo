import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BorrowingStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BorrowBookDto, ReturnBookDto, RenewBorrowingDto, QueryBorrowingsDto } from './dto/borrowings.dto';
import { BorrowingDomainService } from '../domain/services/borrowing.domain-service';

@Injectable()
export class BorrowingsService {
  private readonly logger = new Logger(BorrowingsService.name);

  constructor(
    private prisma: PrismaService,
    private borrowingDomainService: BorrowingDomainService,
  ) {}

  async borrowBook(userId: string, dto: BorrowBookDto) {
    try {
      const result = await this.borrowingDomainService.borrowBook({
        userId,
        bookId: dto.bookId,
      });
      
      const borrowing = await this.prisma.borrowing.findFirst({
        where: { userId, bookId: dto.bookId, status: BorrowingStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        include: { book: { select: { id: true, title: true, author: true, isbn: true } } },
      });

      return {
        message: result.message,
        borrowing: {
          id: borrowing?.id,
          book: borrowing?.book,
          borrowedAt: borrowing?.borrowedAt,
          dueDate: borrowing?.dueDate,
          status: borrowing?.status,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not active')) throw new ForbiddenException(message);
      if (message.includes('reached the maximum')) throw new BadRequestException(message);
      if (message.includes('already borrowed')) throw new ConflictException(message);
      throw new BadRequestException(message);
    }
  }

  async returnBook(userId: string, dto: ReturnBookDto) {
    try {
      const result = await this.borrowingDomainService.returnBook({
        borrowingId: dto.borrowingId,
        userId,
      });

      const borrowing = await this.prisma.borrowing.findUnique({
        where: { id: dto.borrowingId },
        include: { book: { select: { id: true, title: true, author: true } } },
      });

      return {
        message: result.message,
        borrowing: {
          id: borrowing?.id,
          book: borrowing?.book,
          returnedAt: borrowing?.returnedAt,
          status: borrowing?.status,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) throw new NotFoundException(message);
      if (message.includes('only return')) throw new ForbiddenException(message);
      if (message.includes('already been returned')) throw new BadRequestException(message);
      throw new BadRequestException(message);
    }
  }

  async renewBorrowing(userId: string, dto: RenewBorrowingDto) {
    try {
      const result = await this.borrowingDomainService.renewBook({
        borrowingId: dto.borrowingId,
        userId,
      });

      const borrowing = await this.prisma.borrowing.findUnique({
        where: { id: dto.borrowingId },
        include: { book: { select: { id: true, title: true, author: true } } },
      });

      return {
        message: result.message,
        borrowing: {
          id: borrowing?.id,
          book: borrowing?.book,
          dueDate: borrowing?.dueDate,
          renewedCount: borrowing?.renewedCount,
          maxRenewals: borrowing?.maxRenewals,
          renewalsRemaining: (borrowing?.maxRenewals || 0) - (borrowing?.renewedCount || 0),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) throw new NotFoundException(message);
      if (message.includes('only renew')) throw new ForbiddenException(message);
      if (message.includes('cannot be renewed')) throw new BadRequestException(message);
      throw new BadRequestException(message);
    }
  }

  async getMyBorrowings(userId: string, query: QueryBorrowingsDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;

    const [borrowings, total] = await Promise.all([
      this.prisma.borrowing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          book: { select: { id: true, title: true, author: true, isbn: true, coverImage: true } },
        },
      }),
      this.prisma.borrowing.count({ where }),
    ]);

    return {
      borrowings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAllBorrowings(query: QueryBorrowingsDto) {
    const { page = 1, limit = 10, status, userId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [borrowings, total] = await Promise.all([
      this.prisma.borrowing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          book: { select: { id: true, title: true, author: true, isbn: true } },
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.borrowing.count({ where }),
    ]);

    return {
      borrowings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBorrowingById(borrowingId: string, userId: string, userRole: Role) {
    const borrowing = await this.prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: {
        book: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        fine: true,
      },
    });

    if (!borrowing) {
      throw new NotFoundException('Borrowing record not found');
    }

    if (borrowing.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to view this borrowing');
    }

    return borrowing;
  }

  async getOverdueBorrowings() {
    const now = new Date();

    return this.prisma.borrowing.findMany({
      where: { status: BorrowingStatus.ACTIVE, dueDate: { lt: now } },
      include: {
        book: { select: { id: true, title: true, author: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyOverdueCheck() {
    this.logger.log('Running daily overdue check...');
    const result = await this.markOverdueBorrowings();
    this.logger.log(result.message);
  }

  async markOverdueBorrowings() {
    const now = new Date();

    const result = await this.prisma.borrowing.updateMany({
      where: { status: BorrowingStatus.ACTIVE, dueDate: { lt: now } },
      data: { status: BorrowingStatus.OVERDUE },
    });

    return {
      message: `Marked ${result.count} borrowing(s) as overdue`,
      updatedCount: result.count,
    };
  }
}
