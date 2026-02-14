import { Book } from "../entities/book.entity";

export interface IBookRepository {
  findById(id: string): Promise<Book | null>;
  findByISBN(isbn: string): Promise<Book | null>;
  findAll(options?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ books: Book[]; total: number }>;
  save(book: Book): Promise<Book>;
  update(book: Book): Promise<Book>;
  delete(id: string): Promise<void>;
  decrementAvailableCopies(id: string): Promise<boolean>;
  incrementAvailableCopies(id: string): Promise<void>;
  adjustInventory(id: string, adjustment: number): Promise<Book>;
  countActiveBorrowings(bookId: string): Promise<number>;
  countActiveReservations(bookId: string): Promise<number>;
}
