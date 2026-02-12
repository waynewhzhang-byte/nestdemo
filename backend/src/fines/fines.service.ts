import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryFinesDto, PayFineDto, FineStatus } from './dto/fines.dto';
import { FINE_PER_DAY } from '../constants';

@Injectable()
export class FinesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryFinesDto) {
    const { page = 1, limit = 10, status, userId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }

    const [fines, total] = await Promise.all([
      this.prisma.fine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          borrowing: {
            include: {
              book: { select: { id: true, title: true, author: true } },
            },
          },
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.fine.count({ where }),
    ]);

    return {
      fines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyFines(userId: string, query: QueryFinesDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [fines, total] = await Promise.all([
      this.prisma.fine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          borrowing: {
            include: {
              book: { select: { id: true, title: true, author: true, coverImage: true } },
            },
          },
        },
      }),
      this.prisma.fine.count({ where }),
    ]);

    const totalUnpaid = await this.prisma.fine.aggregate({
      where: { userId, status: { in: ['UNPAID', 'PARTIAL'] } },
      _sum: { amount: true },
    });

    const activeOverdueBorrowings = await this.prisma.borrowing.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'OVERDUE'] },
        dueDate: { lt: new Date() },
      },
      include: {
        book: { select: { title: true } },
      },
    });

    const estimatedFines = activeOverdueBorrowings.map((b) => {
      const daysOverdue = Math.ceil(
        (new Date().getTime() - b.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        borrowingId: b.id,
        bookTitle: b.book.title,
        dueDate: b.dueDate,
        daysOverdue,
        estimatedAmount: daysOverdue * FINE_PER_DAY,
      };
    });

    const totalEstimatedAmount = estimatedFines.reduce(
      (sum, ef) => sum + ef.estimatedAmount,
      0,
    );

    return {
      fines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalUnpaidAmount: Number(totalUnpaid._sum.amount || 0),
        totalEstimatedAmount,
        grandTotal: Number(totalUnpaid._sum.amount || 0) + totalEstimatedAmount,
      },
      estimatedFines,
    };
  }

  async findOne(id: string, userId: string, isAdmin: boolean) {
    const fine = await this.prisma.fine.findUnique({
      where: { id },
      include: {
        borrowing: {
          include: {
            book: true,
          },
        },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!fine) {
      throw new NotFoundException('Fine not found');
    }

    if (!isAdmin && fine.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this fine');
    }

    return fine;
  }

  async pay(userId: string, fineId: string, dto: PayFineDto) {
    return this.prisma.$transaction(async (tx) => {
      const fine = await tx.fine.findUnique({
        where: { id: fineId },
      });

      if (!fine) {
        throw new NotFoundException('Fine not found');
      }

      if (fine.userId !== userId) {
        throw new ForbiddenException('You can only pay your own fines');
      }

      if (fine.status === FineStatus.PAID) {
        throw new BadRequestException('This fine has already been fully paid');
      }

      const currentPaid = Number(fine.amount) - this.getRemainingAmount(fine);
      const newPaidAmount = currentPaid + dto.amount;
      const totalAmount = Number(fine.amount);

      if (dto.amount > this.getRemainingAmount(fine)) {
        throw new BadRequestException(
          `Payment amount exceeds remaining fine balance. Remaining: $${this.getRemainingAmount(fine).toFixed(2)}`,
        );
      }

      let newStatus: string;
      if (newPaidAmount >= totalAmount) {
        newStatus = FineStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = FineStatus.PARTIAL;
      } else {
        newStatus = FineStatus.UNPAID;
      }

      const updatedFine = await tx.fine.update({
        where: { id: fineId },
        data: {
          status: newStatus as any,
          paidAt: newPaidAmount >= totalAmount ? new Date() : null,
        },
        include: {
          borrowing: {
            include: {
              book: { select: { id: true, title: true, author: true } },
            },
          },
        },
      });

      return {
        ...updatedFine,
        paymentAmount: dto.amount,
        remainingBalance: totalAmount - newPaidAmount,
        isFullyPaid: newPaidAmount >= totalAmount,
      };
    });
  }

  async waive(fineId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const fine = await tx.fine.findUnique({
        where: { id: fineId },
      });

      if (!fine) {
        throw new NotFoundException('Fine not found');
      }

      if (fine.status === FineStatus.PAID) {
        throw new BadRequestException('Cannot waive a paid fine');
      }

      const updatedFine = await tx.fine.update({
        where: { id: fineId },
        data: {
          status: FineStatus.PAID,
          paidAt: new Date(),
        },
        include: {
          borrowing: {
            include: {
              book: { select: { id: true, title: true, author: true } },
            },
          },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return {
        ...updatedFine,
        waived: true,
        waiverReason: reason || 'Administrative waiver',
      };
    });
  }

  async getStatistics() {
    const [totalFines, unpaidFines, totalAmount, unpaidAmount, byStatus] = await Promise.all([
      this.prisma.fine.count(),
      this.prisma.fine.count({ where: { status: { in: ['UNPAID', 'PARTIAL'] } } }),
      this.prisma.fine.aggregate({ _sum: { amount: true } }),
      this.prisma.fine.aggregate({
        where: { status: { in: ['UNPAID', 'PARTIAL'] } },
        _sum: { amount: true },
      }),
      this.prisma.fine.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const total = Number(totalAmount._sum.amount || 0);
    const unpaid = Number(unpaidAmount._sum.amount || 0);

    return {
      totalFines,
      unpaidFines,
      paidFines: totalFines - unpaidFines,
      totalAmount: total,
      unpaidAmount: unpaid,
      collectedAmount: total - unpaid,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = {
          count: item._count.id,
          amount: Number(item._sum.amount || 0),
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number }>),
    };
  }

  private getRemainingAmount(fine: any): number {
    if (fine.status === FineStatus.PAID) return 0;
    return Number(fine.amount);
  }
}
