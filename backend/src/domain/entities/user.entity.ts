import { Role } from '@prisma/client';

export interface UserProps {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  studentId?: string;
  teacherId?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private readonly props: UserProps;

  constructor(props: UserProps) {
    this.props = props;
  }

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get name(): string { return this.props.name; }
  get role(): Role { return this.props.role; }
  get studentId(): string | undefined { return this.props.studentId; }
  get teacherId(): string | undefined { return this.props.teacherId; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }

  isStudent(): boolean {
    return this.props.role === Role.STUDENT;
  }

  isTeacher(): boolean {
    return this.props.role === Role.TEACHER;
  }

  isAdmin(): boolean {
    return this.props.role === Role.ADMIN;
  }

  canBorrow(): boolean {
    return this.props.isActive;
  }

  toJSON(): UserProps {
    return { ...this.props };
  }
}
