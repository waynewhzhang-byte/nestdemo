import { Injectable, Inject } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { User, UserProps } from "../entities/user.entity";
import { IUserRepository } from "../repositories/user.repository.interface";
import { USER_REPOSITORY } from "../repositories/tokens";
import { UserRole } from "../enums";

export interface CreateUserParams {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  studentId?: string;
  teacherId?: string;
  phone?: string;
}

export interface UpdateUserParams {
  id: string;
  name?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

@Injectable()
export class UserDomainService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async createUser(
    params: CreateUserParams,
  ): Promise<{ user: User; message: string }> {
    const existingByEmail = await this.userRepo.findByEmail(params.email);
    if (existingByEmail) {
      throw new Error("Email already registered");
    }

    if (params.studentId) {
      const existingByStudentId = await this.userRepo.findAll({
        studentId: params.studentId as any,
      });
      if (existingByStudentId.users.length > 0) {
        throw new Error("Student ID already registered");
      }
    }

    if (params.teacherId) {
      const existingByTeacherId = await this.userRepo.findAll({
        teacherId: params.teacherId as any,
      });
      if (existingByTeacherId.users.length > 0) {
        throw new Error("Teacher ID already registered");
      }
    }

    const hashedPassword = await bcrypt.hash(params.password, 10);

    const userProps: UserProps = {
      id: crypto.randomUUID(),
      email: params.email,
      password: hashedPassword,
      name: params.name,
      role: params.role,
      studentId: params.studentId,
      teacherId: params.teacherId,
      phone: params.phone,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const user = new User(userProps);
    const saved = await this.userRepo.save(user);

    return { user: saved, message: "User created successfully" };
  }

  async updateUser(
    params: UpdateUserParams,
  ): Promise<{ user: User; message: string }> {
    const user = await this.userRepo.findById(params.id);
    if (!user) {
      throw new Error("User not found");
    }

    user.update({
      name: params.name,
      phone: params.phone,
    });

    if (params.isActive !== undefined) {
      if (params.isActive) {
        user.activate();
      } else {
        user.deactivate();
      }
    }

    const saved = await this.userRepo.update(user);

    return { user: saved, message: "User updated successfully" };
  }

  async deactivateUser(id: string): Promise<{ user: User; message: string }> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    user.deactivate();
    const saved = await this.userRepo.update(user);

    return { user: saved, message: "User deactivated successfully" };
  }

  async activateUser(id: string): Promise<{ user: User; message: string }> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    user.activate();
    const saved = await this.userRepo.update(user);

    return { user: saved, message: "User activated successfully" };
  }
}
