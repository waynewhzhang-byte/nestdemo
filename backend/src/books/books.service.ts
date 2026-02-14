import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BookDomainService } from "../domain/services/book.domain-service";
import {
  CreateBookDto,
  UpdateBookDto,
  QueryBooksDto,
  AdjustInventoryDto,
} from "./dto/books.dto";

@Injectable()
export class BooksService {
  constructor(
    private prisma: PrismaService,
    private bookDomainService: BookDomainService,
  ) {}

  async create(createBookDto: CreateBookDto) {
    try {
      const result = await this.bookDomainService.createBook({
        isbn: createBookDto.isbn,
        title: createBookDto.title,
        author: createBookDto.author,
        publisher: createBookDto.publisher,
        publishedYear: createBookDto.publishedYear,
        category: createBookDto.category,
        description: createBookDto.description,
        coverImage: createBookDto.coverImage,
        location: createBookDto.location,
        totalCopies: createBookDto.totalCopies,
      });
      return result.book.toJSON();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new BadRequestException(message);
    }
  }

  async findAll(query: QueryBooksDto) {
    const { page = 1, limit = 10, search, category, status, isbn } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: "insensitive" };
    }

    if (status) {
      where.status = status;
    }

    if (isbn) {
      where.isbn = isbn;
    }

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        borrowings: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            borrowedAt: true,
            dueDate: true,
            user: { select: { id: true, name: true, email: true } },
          },
          take: 5,
        },
        reservations: {
          where: { status: { in: ["PENDING", "READY"] } },
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            status: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 5,
        },
        _count: {
          select: {
            borrowings: true,
            reservations: true,
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundException("Book not found");
    }

    return book;
  }

  async findByIsbn(isbn: string) {
    const book = await this.prisma.book.findUnique({ where: { isbn } });

    if (!book) {
      throw new NotFoundException("Book not found");
    }

    return book;
  }

  async update(id: string, updateBookDto: UpdateBookDto) {
    try {
      const result = await this.bookDomainService.updateBook({
        id,
        isbn: updateBookDto.isbn,
        title: updateBookDto.title,
        author: updateBookDto.author,
        publisher: updateBookDto.publisher,
        publishedYear: updateBookDto.publishedYear,
        category: updateBookDto.category,
        description: updateBookDto.description,
        coverImage: updateBookDto.coverImage,
        location: updateBookDto.location,
        totalCopies: updateBookDto.totalCopies,
      });
      return result.book.toJSON();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }

  async adjustInventory(id: string, adjustDto: AdjustInventoryDto) {
    const result = await this.bookDomainService.adjustInventory({
      id,
      adjustment: adjustDto.adjustment,
    });

    return result.book.toJSON();
  }

  async remove(id: string) {
    const { canDelete, reason } = await this.bookDomainService.canDelete(id);

    if (!canDelete) {
      throw new BadRequestException(reason);
    }

    await this.bookDomainService.deleteBook(id);

    return { message: "Book deleted successfully" };
  }

  async getCategories() {
    const categories = await this.prisma.book.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { category: "asc" },
    });

    return categories.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));
  }

  async getStatistics() {
    const [totalBooks, totalCopies, availableCopies, borrowedCopies, byStatus] =
      await Promise.all([
        this.prisma.book.count(),
        this.prisma.book.aggregate({ _sum: { totalCopies: true } }),
        this.prisma.book.aggregate({ _sum: { availableCopies: true } }),
        this.prisma.borrowing.count({ where: { status: "ACTIVE" } }),
        this.prisma.book.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
      ]);

    return {
      totalBooks,
      totalCopies: totalCopies._sum.totalCopies || 0,
      availableCopies: availableCopies._sum.availableCopies || 0,
      borrowedCopies,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
