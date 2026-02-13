import { BookStatus } from "@prisma/client";

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

  get id(): string {
    return this.props.id;
  }
  get isbn(): string {
    return this.props.isbn;
  }
  get title(): string {
    return this.props.title;
  }
  get author(): string {
    return this.props.author;
  }
  get publisher(): string {
    return this.props.publisher;
  }
  get publishedYear(): number {
    return this.props.publishedYear;
  }
  get category(): string {
    return this.props.category;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get coverImage(): string | undefined {
    return this.props.coverImage;
  }
  get location(): string | undefined {
    return this.props.location;
  }
  get totalCopies(): number {
    return this.props.totalCopies;
  }
  get availableCopies(): number {
    return this.props.availableCopies;
  }
  get status(): BookStatus {
    return this.props.status;
  }

  isAvailable(): boolean {
    return (
      this.props.availableCopies > 0 &&
      this.props.status === BookStatus.AVAILABLE
    );
  }

  canBeBorrowed(): boolean {
    return (
      this.props.availableCopies > 0 &&
      this.props.status !== BookStatus.MAINTENANCE &&
      this.props.status !== BookStatus.LOST
    );
  }

  borrow(): void {
    if (!this.canBeBorrowed()) {
      throw new Error("Book is not available for borrowing");
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

  update(updates: Partial<Omit<BookProps, "id" | "createdAt" | "updatedAt">>): void {
    if (updates.title !== undefined) this.props.title = updates.title;
    if (updates.author !== undefined) this.props.author = updates.author;
    if (updates.publisher !== undefined) this.props.publisher = updates.publisher;
    if (updates.publishedYear !== undefined) this.props.publishedYear = updates.publishedYear;
    if (updates.category !== undefined) this.props.category = updates.category;
    if (updates.description !== undefined) this.props.description = updates.description;
    if (updates.coverImage !== undefined) this.props.coverImage = updates.coverImage;
    if (updates.location !== undefined) this.props.location = updates.location;
    if (updates.totalCopies !== undefined) this.props.totalCopies = updates.totalCopies;
    if (updates.availableCopies !== undefined) this.props.availableCopies = updates.availableCopies;
    if (updates.status !== undefined) this.props.status = updates.status;
  }

  toJSON(): BookProps {
    return { ...this.props };
  }
}
