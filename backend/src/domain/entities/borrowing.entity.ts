import { BorrowingStatus, UserRole } from "../enums";

export interface BorrowingProps {
  id: string;
  userId: string;
  bookId: string;
  borrowedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  status: BorrowingStatus;
  renewedCount: number;
  maxRenewals: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Borrowing {
  private readonly props: BorrowingProps;

  constructor(props: BorrowingProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get bookId(): string {
    return this.props.bookId;
  }
  get borrowedAt(): Date {
    return this.props.borrowedAt;
  }
  get dueDate(): Date {
    return this.props.dueDate;
  }
  get returnedAt(): Date | undefined {
    return this.props.returnedAt;
  }
  get status(): BorrowingStatus {
    return this.props.status;
  }
  get renewedCount(): number {
    return this.props.renewedCount;
  }
  get maxRenewals(): number {
    return this.props.maxRenewals;
  }

  isActive(): boolean {
    return this.props.status === BorrowingStatus.ACTIVE;
  }

  isOverdue(): boolean {
    return (
      this.props.status === BorrowingStatus.OVERDUE ||
      (this.isActive() && new Date() > this.props.dueDate)
    );
  }

  isReturned(): boolean {
    return this.props.status === BorrowingStatus.RETURNED;
  }

  canRenew(userRole: UserRole): boolean {
    if (this.isReturned()) return false;
    if (this.props.status === BorrowingStatus.LOST) return false;
    return this.props.renewedCount < this.props.maxRenewals;
  }

  renew(newDueDate: Date): void {
    if (!this.canRenew(UserRole.STUDENT)) {
      throw new Error("This borrowing cannot be renewed");
    }
    this.props.dueDate = newDueDate;
    this.props.renewedCount += 1;
  }

  return(): void {
    if (this.isReturned()) {
      throw new Error("This book has already been returned");
    }
    this.props.returnedAt = new Date();
    this.props.status = BorrowingStatus.RETURNED;
  }

  markOverdue(): void {
    this.props.status = BorrowingStatus.OVERDUE;
  }

  getDaysOverdue(): number {
    const now = new Date();
    if (now <= this.props.dueDate) return 0;
    return Math.ceil(
      (now.getTime() - this.props.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  toJSON(): BorrowingProps {
    return { ...this.props };
  }
}
