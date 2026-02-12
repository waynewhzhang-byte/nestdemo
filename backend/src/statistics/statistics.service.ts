import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsQueryDto, TimeRange } from './dto/statistics.dto';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(timeRange?: TimeRange, startDate?: string, endDate?: string) {
    const now = new Date();
    let start: Date;
    let end = new Date(now);

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (timeRange) {
        case TimeRange.TODAY:
          start = new Date(now.setHours(0, 0, 0, 0));
          break;
        case TimeRange.WEEK:
          start = new Date(now.setDate(now.getDate() - 7));
          break;
        case TimeRange.MONTH:
          start = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case TimeRange.YEAR:
          start = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          start = new Date(now.setMonth(now.getMonth() - 1));
      }
    }

    return { start, end };
  }

  async getDashboardOverview(query: StatisticsQueryDto) {
    const { start, end } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    const [
      totalBooks,
      totalCopies,
      availableCopies,
      totalUsers,
      activeBorrowings,
      overdueBorrowings,
      pendingReservations,
      unpaidFines,
      recentBorrowings,
      recentReturns,
    ] = await Promise.all([
      this.prisma.book.count(),
      this.prisma.book.aggregate({ _sum: { totalCopies: true } }),
      this.prisma.book.aggregate({ _sum: { availableCopies: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.borrowing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.borrowing.count({ where: { status: 'OVERDUE' } }),
      this.prisma.reservation.count({ where: { status: { in: ['PENDING', 'READY'] } } }),
      this.prisma.fine.aggregate({
        where: { status: { in: ['UNPAID', 'PARTIAL'] } },
        _sum: { amount: true },
      }),
      this.prisma.borrowing.count({
        where: { borrowedAt: { gte: start, lte: end } },
      }),
      this.prisma.borrowing.count({
        where: { returnedAt: { gte: start, lte: end } },
      }),
    ]);

    return {
      books: {
        total: totalBooks,
        totalCopies: totalCopies._sum.totalCopies || 0,
        availableCopies: availableCopies._sum.availableCopies || 0,
        borrowedCopies: (totalCopies._sum.totalCopies || 0) - (availableCopies._sum.availableCopies || 0),
      },
      users: {
        total: totalUsers,
      },
      borrowings: {
        active: activeBorrowings,
        overdue: overdueBorrowings,
        recentBorrowings,
        recentReturns,
      },
      reservations: {
        pending: pendingReservations,
      },
      fines: {
        unpaidAmount: Number(unpaidFines._sum.amount || 0),
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  }

  async getBorrowingStatistics(query: StatisticsQueryDto) {
    const { start, end } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    const [byStatus, dailyBorrowings, dailyReturns, topBorrowedBooks, topBorrowers] = await Promise.all([
      this.prisma.borrowing.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.borrowing.groupBy({
        by: ['borrowedAt'],
        where: { borrowedAt: { gte: start, lte: end } },
        _count: { id: true },
      }),
      this.prisma.borrowing.groupBy({
        by: ['returnedAt'],
        where: { returnedAt: { gte: start, lte: end } },
        _count: { id: true },
      }),
      this.prisma.borrowing.groupBy({
        by: ['bookId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.borrowing.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const topBorrowedBooksWithDetails = await Promise.all(
      topBorrowedBooks.map(async (item) => {
        const book = await this.prisma.book.findUnique({
          where: { id: item.bookId },
          select: { id: true, title: true, author: true },
        });
        return { ...book, borrowCount: item._count.id };
      }),
    );

    const topBorrowersWithDetails = await Promise.all(
      topBorrowers.map(async (item) => {
        const user = await this.prisma.user.findUnique({
          where: { id: item.userId },
          select: { id: true, name: true, email: true, role: true },
        });
        return { ...user, borrowCount: item._count.id };
      }),
    );

    return {
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      dailyBorrowings: dailyBorrowings.map((item) => ({
        date: item.borrowedAt,
        count: item._count.id,
      })),
      dailyReturns: dailyReturns.map((item) => ({
        date: item.returnedAt,
        count: item._count.id,
      })),
      topBorrowedBooks: topBorrowedBooksWithDetails,
      topBorrowers: topBorrowersWithDetails,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  }

  async getBookStatistics(query: StatisticsQueryDto) {
    const [byStatus, byCategory, lowStock, recentlyAdded] = await Promise.all([
      this.prisma.book.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.book.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.book.findMany({
        where: {
          OR: [
            { availableCopies: { lte: 2 } },
            { totalCopies: { lte: 2 } },
          ],
        },
        select: { id: true, title: true, author: true, availableCopies: true, totalCopies: true },
        take: 20,
      }),
      this.prisma.book.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, author: true, createdAt: true },
        take: 10,
      }),
    ]);

    return {
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count.id,
      })),
      lowStock,
      recentlyAdded,
    };
  }

  async getUserStatistics(query: StatisticsQueryDto) {
    const { start, end } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    const [byRole, byStatus, newUsers, mostActiveUsers] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['isActive'],
        _count: { id: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.borrowing.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const mostActiveUsersWithDetails = await Promise.all(
      mostActiveUsers.map(async (item) => {
        const user = await this.prisma.user.findUnique({
          where: { id: item.userId },
          select: { id: true, name: true, email: true, role: true },
        });
        return { ...user, totalBorrowings: item._count.id };
      }),
    );

    return {
      byRole: byRole.reduce((acc, item) => {
        acc[item.role] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byStatus: {
        active: byStatus.find((s) => s.isActive === true)?._count.id || 0,
        inactive: byStatus.find((s) => s.isActive === false)?._count.id || 0,
      },
      newUsers,
      mostActiveUsers: mostActiveUsersWithDetails,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  }

  async getFineStatistics(query: StatisticsQueryDto) {
    const { start, end } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    const [byStatus, totalFines, collectedFines, topDebtors] = await Promise.all([
      this.prisma.fine.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.fine.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.fine.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.fine.groupBy({
        by: ['userId'],
        where: { status: { in: ['UNPAID', 'PARTIAL'] } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
    ]);

    const topDebtorsWithDetails = await Promise.all(
      topDebtors.map(async (item) => {
        const user = await this.prisma.user.findUnique({
          where: { id: item.userId },
          select: { id: true, name: true, email: true, role: true },
        });
        return { ...user, unpaidAmount: Number(item._sum.amount || 0) };
      }),
    );

    return {
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = {
          count: item._count.id,
          amount: Number(item._sum.amount || 0),
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number }>),
      summary: {
        totalFines: totalFines._count.id,
        totalAmount: Number(totalFines._sum.amount || 0),
        collectedAmount: Number(collectedFines._sum.amount || 0),
        outstandingAmount: Number((totalFines._sum.amount || 0)) - Number((collectedFines._sum.amount || 0)),
      },
      topDebtors: topDebtorsWithDetails,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  }

  async getMonthlyTrends() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));

    const [borrowings, returns, newUsers, fines] = await Promise.all([
      this.prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
        SELECT DATE_TRUNC('month', "borrowedAt") as month, COUNT(*) as count
        FROM borrowings
        WHERE "borrowedAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "borrowedAt")
        ORDER BY month ASC
      `,
      this.prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
        SELECT DATE_TRUNC('month', "returnedAt") as month, COUNT(*) as count
        FROM borrowings
        WHERE "returnedAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "returnedAt")
        ORDER BY month ASC
      `,
      this.prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as count
        FROM users
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      this.prisma.$queryRaw<Array<{ month: Date; amount: number }>>`
        SELECT DATE_TRUNC('month', "createdAt") as month, SUM(amount) as amount
        FROM fines
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
    ]);

    return {
      borrowings: borrowings.map((b) => ({
        month: b.month,
        count: Number(b.count),
      })),
      returns: returns.map((r) => ({
        month: r.month,
        count: Number(r.count),
      })),
      newUsers: newUsers.map((u) => ({
        month: u.month,
        count: Number(u.count),
      })),
      fines: fines.map((f) => ({
        month: f.month,
        amount: Number(f.amount || 0),
      })),
    };
  }
}
