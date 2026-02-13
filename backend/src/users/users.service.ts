import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserDomainService } from "../domain/services/user.domain-service";
import { QueryUsersDto, CreateUserDto, UpdateUserDto } from "./dto/users.dto";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private userDomainService: UserDomainService,
  ) {}

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
        { name: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;
    if (typeof isActive === "boolean") where.isActive = isActive;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      by: ["userId"],
      where: {
        userId: { in: userIds },
        status: { in: ["UNPAID", "PARTIAL"] },
      },
      _sum: { amount: true },
    });
    const finesMap = new Map(
      finesAgg.map((f) => [f.userId, Number(f._sum.amount || 0)]),
    );

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
    if (!user) throw new NotFoundException("User not found");
    const finesSum = await this.prisma.fine.aggregate({
      where: { userId: id, status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { amount: true },
    });
    return {
      ...user,
      borrowingsCount: user._count.borrowings,
      finesOwed: Number(finesSum._sum.amount || 0),
    };
  }

  async create(dto: CreateUserDto) {
    const result = await this.userDomainService.createUser({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: dto.role as any,
      studentId: dto.studentId,
      teacherId: dto.teacherId,
      phone: dto.phone,
    });

    const { password, ...sanitized } = result.user.toJSON();
    return sanitized;
  }

  async update(id: string, dto: UpdateUserDto) {
    const result = await this.userDomainService.updateUser({
      id,
      name: dto.name,
      phone: dto.phone,
      role: dto.role as any,
      isActive: dto.isActive,
    });

    const { password, ...sanitized } = result.user.toJSON();
    return sanitized;
  }

  async remove(id: string) {
    await this.userDomainService.deactivateUser(id);
    return { message: "User deactivated successfully" };
  }
}
