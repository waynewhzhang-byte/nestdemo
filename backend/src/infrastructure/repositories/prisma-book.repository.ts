import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Book, BookProps } from "../../domain/entities/book.entity";
import { IBookRepository } from "../../domain/repositories/book.repository.interface";
import { BookStatus, BorrowingStatus, ReservationStatus } from "@prisma/client";

@Injectable()
export class PrismaBookRepository implements IBookRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(data: any): Book {
    const props: BookProps = {
      id: data.id,
      isbn: data.isbn,
      title: data.title,
      author: data.author,
      publisher: data.publisher,
      publishedYear: data.publishedYear,
      category: data.category,
      description: data.description,
      coverImage: data.coverImage,
      location: data.location,
      totalCopies: data.totalCopies,
      availableCopies: data.availableCopies,
      status: data.status as BookStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    return new Book(props);
  }

  async findById(id: string): Promise<Book | null> {
    const book = await this.prisma.book.findUnique({ where: { id } });
    return book ? this.toEntity(book) : null;
  }

  async findByISBN(isbn: string): Promise<Book | null> {
    const book = await this.prisma.book.findUnique({ where: { isbn } });
    return book ? this.toEntity(book) : null;
  }

  async findAll(options?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ books: Book[]; total: number }> {
    const where: any = {};
    if (options?.category) where.category = options.category;
    if (options?.search) {
      where.OR = [
        { title: { contains: options.search, mode: "insensitive" } },
        { author: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.book.count({ where }),
    ]);

    return { books: books.map((b) => this.toEntity(b)), total };
  }

  async save(book: Book): Promise<Book> {
    const data = book.toJSON();
    const created = await this.prisma.book.create({ data });
    return this.toEntity(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.book.delete({ where: { id } });
  }

  async decrementAvailableCopies(id: string): Promise<boolean> {
    const result = await this.prisma.book.updateMany({
      where: { id, availableCopies: { gt: 0 } },
      data: { availableCopies: { decrement: 1 } },
    });
    return result.count > 0;
  }

  async incrementAvailableCopies(id: string): Promise<void> {
    await this.prisma.book.update({
      where: { id },
      data: {
        availableCopies: { increment: 1 },
        status: BookStatus.AVAILABLE,
      },
    });
  }

  async update(book: Book): Promise<Book> {
    const data = book.toJSON();
    const updated = await this.prisma.book.update({
      where: { id: book.id },
      data,
    });
    return this.toEntity(updated);
  }

  async adjustInventory(id: string, adjustment: number): Promise<Book> {
    const updated = await this.prisma.book.update({
      where: { id },
      data: {
        totalCopies: { increment: adjustment },
        availableCopies: { increment: adjustment },
        status:
          adjustment < 0
            ? undefined
            : BookStatus.AVAILABLE,
      },
    });
    return this.toEntity(updated);
  }

  async countActiveBorrowings(bookId: string): Promise<number> {
    return this.prisma.borrowing.count({
      where: { bookId, status: BorrowingStatus.ACTIVE },
    });
  }

  async countActiveReservations(bookId: string): Promise<number> {
    return this.prisma.reservation.count({
      where: {
        bookId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.READY] },
      },
    });
  }
}
