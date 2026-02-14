import { Injectable } from "@nestjs/common";
import { Book, BookProps } from "../entities/book.entity";
import { PrismaBookRepository } from "../../infrastructure/repositories/prisma-book.repository";
import { BookStatus } from "@prisma/client";

export interface CreateBookParams {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  category: string;
  description?: string;
  coverImage?: string;
  location?: string;
  totalCopies?: number;
}

export interface UpdateBookParams {
  id: string;
  isbn?: string;
  title?: string;
  author?: string;
  publisher?: string;
  publishedYear?: number;
  category?: string;
  description?: string;
  coverImage?: string;
  location?: string;
  totalCopies?: number;
}

export interface AdjustInventoryParams {
  id: string;
  adjustment: number;
}

export interface BookWithDetails {
  book: Book;
  borrowings: any[];
  reservations: any[];
  stats: { borrowingsCount: number; reservationsCount: number };
}

@Injectable()
export class BookDomainService {
  constructor(private readonly bookRepo: PrismaBookRepository) {}

  async createBook(
    params: CreateBookParams,
  ): Promise<{ book: Book; message: string }> {
    const existingBook = await this.bookRepo.findByISBN(params.isbn);
    if (existingBook) {
      throw new Error("A book with this ISBN already exists");
    }

    const totalCopies = params.totalCopies || 1;
    const bookProps: BookProps = {
      id: crypto.randomUUID(),
      isbn: params.isbn,
      title: params.title,
      author: params.author,
      publisher: params.publisher,
      publishedYear: params.publishedYear,
      category: params.category,
      description: params.description,
      coverImage: params.coverImage,
      location: params.location,
      totalCopies,
      availableCopies: totalCopies,
      status: BookStatus.AVAILABLE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const book = new Book(bookProps);
    const saved = await this.bookRepo.save(book);

    return { book: saved, message: "Book created successfully" };
  }

  async updateBook(
    params: UpdateBookParams,
  ): Promise<{ book: Book; message: string }> {
    const book = await this.bookRepo.findById(params.id);
    if (!book) {
      throw new Error("Book not found");
    }

    if (params.isbn && params.isbn !== book.isbn) {
      const existingWithIsbn = await this.bookRepo.findByISBN(params.isbn);
      if (existingWithIsbn) {
        throw new Error("A book with this ISBN already exists");
      }
    }

    if (params.totalCopies !== undefined) {
      const diff = params.totalCopies - book.totalCopies;
      const newAvailableCopies = book.availableCopies + diff;

      if (newAvailableCopies < 0) {
        throw new Error(
          "Cannot reduce total copies below the number of currently borrowed copies",
        );
      }

      const updated = await this.bookRepo.adjustInventory(params.id, diff);
      return {
        book: updated,
        message: "Book inventory updated successfully",
      };
    }

    book.update({
      title: params.title,
      author: params.author,
      publisher: params.publisher,
      publishedYear: params.publishedYear,
      category: params.category,
      description: params.description,
      coverImage: params.coverImage,
      location: params.location,
    });
    const saved = await this.bookRepo.update(book);

    return { book: saved, message: "Book updated successfully" };
  }

  async adjustInventory(
    params: AdjustInventoryParams,
  ): Promise<{ book: Book; message: string }> {
    const book = await this.bookRepo.findById(params.id);
    if (!book) {
      throw new Error("Book not found");
    }

    const newTotalCopies = book.totalCopies + params.adjustment;
    const newAvailableCopies = book.availableCopies + params.adjustment;

    if (newTotalCopies < 0 || newAvailableCopies < 0) {
      throw new Error("Adjustment would result in negative inventory");
    }

    const updated = await this.bookRepo.adjustInventory(params.id, params.adjustment);
    return { book: updated, message: "Inventory adjusted successfully" };
  }

  async canDelete(id: string): Promise<{ canDelete: boolean; reason?: string }> {
    const activeBorrowings = await this.bookRepo.countActiveBorrowings(id);
    if (activeBorrowings > 0) {
      return {
        canDelete: false,
        reason: `Cannot delete book with ${activeBorrowings} active borrowing(s)`,
      };
    }

    const activeReservations = await this.bookRepo.countActiveReservations(id);
    if (activeReservations > 0) {
      return {
        canDelete: false,
        reason: `Cannot delete book with ${activeReservations} active reservation(s)`,
      };
    }

    return { canDelete: true };
  }

  async deleteBook(id: string): Promise<void> {
    await this.bookRepo.delete(id);
  }
}
