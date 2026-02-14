import { UserRole } from "../enums";

export interface UserProps {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
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

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get name(): string {
    return this.props.name;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get studentId(): string | undefined {
    return this.props.studentId;
  }
  get teacherId(): string | undefined {
    return this.props.teacherId;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  isStudent(): boolean {
    return this.props.role === UserRole.STUDENT;
  }

  isTeacher(): boolean {
    return this.props.role === UserRole.TEACHER;
  }

  isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }

  canBorrow(): boolean {
    return this.props.isActive;
  }

  activate(): void {
    this.props.isActive = true;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  update(updates: { name?: string; phone?: string }): void {
    if (updates.name !== undefined) this.props.name = updates.name;
    if (updates.phone !== undefined) this.props.phone = updates.phone;
  }

  toJSON(): UserProps {
    return { ...this.props };
  }
}
