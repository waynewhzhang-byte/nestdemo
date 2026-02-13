import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Fine, FineProps } from "../../domain/entities/fine.entity";
import { IFineRepository } from "../../domain/repositories/fine.repository.interface";
import { FineStatus } from "@prisma/client";

@Injectable()
export class PrismaFineRepository implements IFineRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(data: any): Fine {
    const props: FineProps = {
      id: data.id,
      borrowingId: data.borrowingId,
      userId: data.userId,
      amount: data.amount,
      reason: data.reason,
      status: data.status as FineStatus,
      paidAt: data.paidAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    return new Fine(props);
  }

  async findById(id: string): Promise<Fine | null> {
    const fine = await this.prisma.fine.findUnique({ where: { id } });
    return fine ? this.toEntity(fine) : null;
  }

  async findByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ fines: Fine[]; total: number }> {
    const where: any = { userId };
    if (options?.status) where.status = options.status;

    const [fines, total] = await Promise.all([
      this.prisma.fine.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.fine.count({ where }),
    ]);

    return { fines: fines.map((f) => this.toEntity(f)), total };
  }

  async findByBorrowingId(borrowingId: string): Promise<Fine[]> {
    const fines = await this.prisma.fine.findMany({
      where: { borrowingId },
    });
    return fines.map((f) => this.toEntity(f));
  }

  async findAll(options?: {
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ fines: Fine[]; total: number }> {
    const where: any = {};
    if (options?.status) where.status = options.status;
    if (options?.userId) where.userId = options.userId;

    const [fines, total] = await Promise.all([
      this.prisma.fine.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.fine.count({ where }),
    ]);

    return { fines: fines.map((f) => this.toEntity(f)), total };
  }

  async save(fine: Fine): Promise<Fine> {
    const data = fine.toJSON();
    const created = await this.prisma.fine.create({ data });
    return this.toEntity(created);
  }

  async update(fine: Fine): Promise<Fine> {
    const data = fine.toJSON();
    const updated = await this.prisma.fine.update({
      where: { id: fine.id },
      data,
    });
    return this.toEntity(updated);
  }

  async getTotalUnpaidByUserId(userId: string): Promise<number> {
    const result = await this.prisma.fine.aggregate({
      where: { userId, status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  }
}
