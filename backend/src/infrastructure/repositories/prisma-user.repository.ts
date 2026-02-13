import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { User, UserProps } from "../../domain/entities/user.entity";
import { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { Role } from "@prisma/client";

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(data: any): User {
    const props: UserProps = {
      id: data.id,
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role as Role,
      studentId: data.studentId,
      teacherId: data.teacherId,
      phone: data.phone,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    return new User(props);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toEntity(user) : null;
  }

  async findAll(options?: {
    role?: string;
    isActive?: boolean;
    studentId?: string;
    teacherId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const where: any = {};
    if (options?.role) where.role = options.role;
    if (options?.isActive !== undefined) where.isActive = options.isActive;
    if (options?.studentId) where.studentId = options.studentId;
    if (options?.teacherId) where.teacherId = options.teacherId;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users: users.map((u) => this.toEntity(u)), total };
  }

  async save(user: User): Promise<User> {
    const data = user.toJSON();
    const created = await this.prisma.user.create({ data });
    return this.toEntity(created);
  }

  async update(user: User): Promise<User> {
    const data = user.toJSON();
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
    });
    return this.toEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
