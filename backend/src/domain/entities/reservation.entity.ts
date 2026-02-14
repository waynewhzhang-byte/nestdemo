import { ReservationStatus } from "../enums";

export interface ReservationProps {
  id: string;
  userId: string;
  bookId: string;
  status: ReservationStatus;
  createdAt: Date;
  expiresAt: Date;
  notifiedAt?: Date;
  fulfilledAt?: Date;
}

export class Reservation {
  private readonly props: ReservationProps;

  constructor(props: ReservationProps) {
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
  get status(): ReservationStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get notifiedAt(): Date | undefined {
    return this.props.notifiedAt;
  }

  isPending(): boolean {
    return this.props.status === ReservationStatus.PENDING;
  }

  isReady(): boolean {
    return this.props.status === ReservationStatus.READY;
  }

  isExpired(): boolean {
    return (
      this.props.status === ReservationStatus.EXPIRED ||
      (this.isReady() && new Date() > this.props.expiresAt)
    );
  }

  isFulfilled(): boolean {
    return this.props.status === ReservationStatus.FULFILLED;
  }

  isCancelled(): boolean {
    return this.props.status === ReservationStatus.CANCELLED;
  }

  markReady(): void {
    if (!this.isPending()) {
      throw new Error("Only pending reservations can be marked as ready");
    }
    this.props.status = ReservationStatus.READY;
    this.props.notifiedAt = new Date();
  }

  fulfill(): void {
    if (!this.isReady()) {
      throw new Error("Only ready reservations can be fulfilled");
    }
    this.props.status = ReservationStatus.FULFILLED;
    this.props.fulfilledAt = new Date();
  }

  cancel(): void {
    if (this.isFulfilled()) {
      throw new Error("Cannot cancel a fulfilled reservation");
    }
    this.props.status = ReservationStatus.CANCELLED;
  }

  expire(): void {
    this.props.status = ReservationStatus.EXPIRED;
  }

  extendExpiry(newExpiresAt: Date): void {
    this.props.expiresAt = newExpiresAt;
  }

  toJSON(): ReservationProps {
    return { ...this.props };
  }
}
