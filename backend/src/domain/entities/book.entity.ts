import { BookStatus } from '@prisma/client';

export interface BookProps {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  category: string;
  description?: string;
  coverImage?: string;
  location?: string;
  totalCopies: number;
  availableCopies: number;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Book {
  private readonly props: BookProps;

  constructor(props: BookProps) {
    this.props = props;
  }

  get id(): string { return this.props.id; }
  get isbn(): string { return this.props.isbn; }
  get title(): string { return this.props.title; }
  get author(): string { return this.props.author; }
  get category(): string { return this.props.category; }
  get totalCopies(): number { return this.props.totalCopies; }
  get availableCopies(): number { return this.props.availableCopies; }
  get status(): BookStatus { return this.props.status; }

  isAvailable(): boolean {
    return this.props.availableCopies > 0 && 
           this.props.status === BookStatus.AVAILABLE;
  }

  canBeBorrowed(): boolean {
    return this.props.availableCopies > 0 &&
           this.props.status !== BookStatus.MAINTENANCE &&
           this.props.status !== BookStatus.LOST;
  }

  borrow(): void {
    if (!this.canBeBorrowed()) {
      throw new Error('Book is not available for borrowing');
    }
    this.props.availableCopies -= 1;
    if (this.props.availableCopies === 0) {
      this.props.status = BookStatus.BORROWED;
    }
  }

  return(): void {
    this.props.availableCopies += 1;
    if (this.props.status === BookStatus.BORROWED) {
      this.props.status = BookStatus.AVAILABLE;
    }
  }

  toJSON(): BookProps {
    return { ...this.props };
  }
}
