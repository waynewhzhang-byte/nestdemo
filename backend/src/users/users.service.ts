import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { QueryUsersDto, CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeUser(user: { password?: string; [key: string]: unknown }) {
    const { password, ...rest } = user;
    return rest;
  }

  async findAll(query: QueryUsersDto) {
    const { page = 1, limit = 10, search, role, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          studentId: true,
          teacherId: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { borrowings: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    const finesAgg = await this.prisma.fine.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: { in: ['UNPAID', 'PARTIAL'] },
      },
      _sum: { amount: true },
    });
    const finesMap = new Map(finesAgg.map((f) => [f.userId, Number(f._sum.amount || 0)]));

    const usersWithStats = users.map((u) => {
      const { _count, ...rest } = u;
      return {
        ...rest,
        borrowingsCount: _count.borrowings,
        finesOwed: finesMap.get(u.id) ?? 0,
      };
    });

    return {
      users: usersWithStats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentId: true,
        teacherId: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { borrowings: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const finesSum = await this.prisma.fine.aggregate({
      where: { userId: id, status: { in: ['UNPAID', 'PARTIAL'] } },
      _sum: { amount: true },
    });
    return {
      ...user,
      borrowingsCount: user._count.borrowings,
      finesOwed: Number(finesSum._sum.amount || 0),
    };
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    if (dto.studentId) {
      const s = await this.prisma.user.findUnique({ where: { studentId: dto.studentId } });
      if (s) throw new ConflictException('Student ID already registered');
    }
    if (dto.teacherId) {
      const t = await this.prisma.user.findUnique({ where: { teacherId: dto.teacherId } });
      if (t) throw new ConflictException('Teacher ID already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role as Role,
        studentId: dto.studentId,
        teacherId: dto.teacherId,
        phone: dto.phone,
      },
    });
    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role !== undefined && { role: dto.role as Role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return this.sanitizeUser(updated);
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'User deactivated successfully' };
  }
}
