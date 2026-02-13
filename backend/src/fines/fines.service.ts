import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaFineRepository } from "../infrastructure/repositories/prisma-fine.repository";
import { FineDomainService } from "../domain/services/fine.domain-service";
import { QueryFinesDto, PayFineDto } from "./dto/fines.dto";

@Injectable()
export class FinesService {
  constructor(
    private prisma: PrismaService,
    private fineDomainService: FineDomainService,
    private fineRepo: PrismaFineRepository,
  ) {}

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
        orderBy: { createdAt: "desc" },
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
        orderBy: { createdAt: "desc" },
        include: {
          borrowing: {
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  author: true,
                  coverImage: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.fine.count({ where }),
    ]);

    const summary = await this.fineDomainService.getUserFineSummary(userId);

    const activeOverdueBorrowings = await this.prisma.borrowing.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "OVERDUE"] },
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
        estimatedAmount: daysOverdue * 0.5,
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
        totalUnpaidAmount: summary.totalUnpaid,
        totalEstimatedAmount,
        grandTotal: summary.totalUnpaid + totalEstimatedAmount,
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
      throw new NotFoundException("Fine not found");
    }

    if (!isAdmin && fine.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to view this fine",
      );
    }

    return fine;
  }

  async pay(userId: string, fineId: string, dto: PayFineDto) {
    const result = await this.fineDomainService.payFine({
      fineId,
      userId,
      amount: dto.amount,
    });

    const fine = await this.prisma.fine.findUnique({
      where: { id: fineId },
      include: {
        borrowing: {
          include: {
            book: { select: { id: true, title: true, author: true } },
          },
        },
      },
    });

    return {
      ...fine,
      paymentAmount: dto.amount,
      remainingBalance: Number(fine!.amount) - dto.amount,
      isFullyPaid: result.fine.isPaid(),
    };
  }

  async waive(fineId: string, reason?: string) {
    const result = await this.fineDomainService.waiveFine({
      fineId,
      reason,
    });

    const fine = await this.prisma.fine.findUnique({
      where: { id: fineId },
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
      ...fine,
      waived: true,
      waiverReason: reason || "Administrative waiver",
    };
  }

  async getStatistics() {
    const [totalFines, unpaidFines, totalAmount, unpaidAmount, byStatus] =
      await Promise.all([
        this.prisma.fine.count(),
        this.prisma.fine.count({
          where: { status: { in: ["UNPAID", "PARTIAL"] } },
        }),
        this.prisma.fine.aggregate({ _sum: { amount: true } }),
        this.prisma.fine.aggregate({
          where: { status: { in: ["UNPAID", "PARTIAL"] } },
          _sum: { amount: true },
        }),
        this.prisma.fine.groupBy({
          by: ["status"],
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
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = {
            count: item._count.id,
            amount: Number(item._sum.amount || 0),
          };
          return acc;
        },
        {} as Record<string, { count: number; amount: number }>,
      ),
    };
  }
}
