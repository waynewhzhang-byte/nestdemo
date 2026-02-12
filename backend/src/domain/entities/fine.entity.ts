import { FineStatus } from '@prisma/client';

export interface FineProps {
  id: string;
  borrowingId: string;
  userId: string;
  amount: number;
  reason: string;
  status: FineStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Fine {
  private readonly props: FineProps;

  constructor(props: FineProps) {
    this.props = props;
  }

  get id(): string { return this.props.id; }
  get borrowingId(): string { return this.props.borrowingId; }
  get userId(): string { return this.props.userId; }
  get amount(): number { return this.props.amount; }
  get reason(): string { return this.props.reason; }
  get status(): FineStatus { return this.props.status; }
  get paidAt(): Date | undefined { return this.props.paidAt; }

  isUnpaid(): boolean {
    return this.props.status === FineStatus.UNPAID;
  }

  isPartial(): boolean {
    return this.props.status === FineStatus.PARTIAL;
  }

  isPaid(): boolean {
    return this.props.status === FineStatus.PAID;
  }

  pay(amount: number): void {
    if (this.isPaid()) {
      throw new Error('This fine has already been fully paid');
    }
    if (amount > this.props.amount) {
      throw new Error('Payment amount exceeds fine amount');
    }
    this.props.status = FineStatus.PAID;
    this.props.paidAt = new Date();
  }

  waive(): void {
    if (this.isPaid()) {
      throw new Error('Cannot waive a paid fine');
    }
    this.props.status = FineStatus.PAID;
    this.props.paidAt = new Date();
  }

  getRemainingAmount(): number {
    return this.props.amount;
  }

  toJSON(): FineProps {
    return { ...this.props };
  }
}
