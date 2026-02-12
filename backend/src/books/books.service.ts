import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBookDto,
  UpdateBookDto,
  QueryBooksDto,
  AdjustInventoryDto,
  BookStatus,
} from './dto/books.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async create(createBookDto: CreateBookDto) {
    const existingBook = await this.prisma.book.findUnique({
      where: { isbn: createBookDto.isbn },
    });

    if (existingBook) {
      throw new ConflictException('A book with this ISBN already exists');
    }

    const book = await this.prisma.book.create({
      data: {
        ...createBookDto,
        availableCopies: createBookDto.totalCopies || 1,
        status: BookStatus.AVAILABLE,
      },
    });

    return book;
  }

  async findAll(query: QueryBooksDto) {
    const { page = 1, limit = 10, search, category, status, isbn } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
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
        orderBy: { createdAt: 'desc' },
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
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            borrowedAt: true,
            dueDate: true,
            user: { select: { id: true, name: true, email: true } },
          },
          take: 5,
        },
        reservations: {
          where: { status: { in: ['PENDING', 'READY'] } },
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            status: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
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
      throw new NotFoundException('Book not found');
    }

    return book;
  }

  async findByIsbn(isbn: string) {
    const book = await this.prisma.book.findUnique({
      where: { isbn },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return book;
  }

  async update(id: string, updateBookDto: UpdateBookDto) {
    const existingBook = await this.prisma.book.findUnique({
      where: { id },
    });

    if (!existingBook) {
      throw new NotFoundException('Book not found');
    }

    if (updateBookDto.isbn && updateBookDto.isbn !== existingBook.isbn) {
      const bookWithIsbn = await this.prisma.book.findUnique({
        where: { isbn: updateBookDto.isbn },
      });

      if (bookWithIsbn) {
        throw new ConflictException('A book with this ISBN already exists');
      }
    }

    if (updateBookDto.totalCopies !== undefined) {
      const diff = updateBookDto.totalCopies - existingBook.totalCopies;
      const newAvailableCopies = existingBook.availableCopies + diff;

      if (newAvailableCopies < 0) {
        throw new BadRequestException(
          'Cannot reduce total copies below the number of currently borrowed copies',
        );
      }

      return this.prisma.book.update({
        where: { id },
        data: {
          ...updateBookDto,
          availableCopies: newAvailableCopies,
          status: newAvailableCopies === 0 ? BookStatus.BORROWED : BookStatus.AVAILABLE,
        },
      });
    }

    return this.prisma.book.update({
      where: { id },
      data: updateBookDto,
    });
  }

  async adjustInventory(id: string, adjustDto: AdjustInventoryDto) {
    return this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id },
      });

      if (!book) {
        throw new NotFoundException('Book not found');
      }

      const newTotalCopies = book.totalCopies + adjustDto.adjustment;
      const newAvailableCopies = book.availableCopies + adjustDto.adjustment;

      if (newTotalCopies < 0 || newAvailableCopies < 0) {
        throw new BadRequestException(
          'Adjustment would result in negative inventory',
        );
      }

      const updatedBook = await tx.book.update({
        where: { id },
        data: {
          totalCopies: newTotalCopies,
          availableCopies: newAvailableCopies,
          status: newAvailableCopies === 0 ? BookStatus.BORROWED : BookStatus.AVAILABLE,
        },
      });

      return updatedBook;
    });
  }

  async remove(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            borrowings: { where: { status: 'ACTIVE' } },
            reservations: { where: { status: { in: ['PENDING', 'READY'] } } },
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const activeBorrowings = book._count.borrowings;
    const activeReservations = book._count.reservations;

    if (activeBorrowings > 0 || activeReservations > 0) {
      throw new BadRequestException(
        `Cannot delete book with ${activeBorrowings} active borrowings and ${activeReservations} active reservations`,
      );
    }

    await this.prisma.book.delete({
      where: { id },
    });

    return { message: 'Book deleted successfully' };
  }

  async getCategories() {
    const categories = await this.prisma.book.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { category: 'asc' },
    });

    return categories.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));
  }

  async getStatistics() {
    const [totalBooks, totalCopies, availableCopies, borrowedCopies, byStatus] = await Promise.all([
      this.prisma.book.count(),
      this.prisma.book.aggregate({ _sum: { totalCopies: true } }),
      this.prisma.book.aggregate({ _sum: { availableCopies: true } }),
      this.prisma.borrowing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.book.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    return {
      totalBooks,
      totalCopies: totalCopies._sum.totalCopies || 0,
      availableCopies: availableCopies._sum.availableCopies || 0,
      borrowedCopies,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
