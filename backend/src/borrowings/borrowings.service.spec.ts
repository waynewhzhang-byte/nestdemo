import { Test, TestingModule } from '@nestjs/testing';
import { BorrowingsService } from './borrowings.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('BorrowingsService', () => {
  let service: BorrowingsService;
  let txMock: {
    user: { findUnique: jest.Mock };
    book: { findUnique: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
    borrowing: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; count: jest.Mock };
    fine: { count: jest.Mock; create?: jest.Mock };
    reservation?: { findFirst: jest.Mock; update: jest.Mock };
  };

  const mockUser = { id: 'user-1', email: 'test@school.edu', role: 'STUDENT', isActive: true };
  const mockBook = { id: 'book-1', title: 'Test Book', availableCopies: 3, status: 'AVAILABLE' };
  const mockBorrowing = {
    id: 'borrowing-1',
    userId: 'user-1',
    bookId: 'book-1',
    borrowedAt: new Date(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    returnedAt: null,
    status: 'ACTIVE',
    renewedCount: 0,
    maxRenewals: 2,
    book: mockBook,
    user: mockUser,
  };

  beforeEach(async () => {
    txMock = {
      user: { findUnique: jest.fn() },
      book: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
      borrowing: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      fine: { count: jest.fn() },
      reservation: { findFirst: jest.fn(), update: jest.fn() },
    };
    const mockPrisma = {
      ...txMock,
      $transaction: jest.fn((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BorrowingsService>(BorrowingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('borrowBook', () => {
    it('should successfully borrow a book', async () => {
      txMock.user.findUnique.mockResolvedValue(mockUser);
      txMock.borrowing.count.mockResolvedValue(0);
      txMock.fine.count.mockResolvedValue(0);
      txMock.book.findUnique.mockResolvedValue({ ...mockBook, status: 'AVAILABLE' });
      txMock.borrowing.findFirst.mockResolvedValue(null);
      txMock.book.updateMany.mockResolvedValue({ count: 1 });
      txMock.book.findUnique.mockResolvedValue({ availableCopies: 0 });
      txMock.borrowing.create.mockResolvedValue({
        ...mockBorrowing,
        book: { id: 'book-1', title: 'Test Book', author: 'Author', isbn: '123' },
      });

      const result = await service.borrowBook('user-1', { bookId: 'book-1' });

      expect(result.message).toBeDefined();
      expect(result.borrowing.status).toBe('ACTIVE');
    });

    it('should throw NotFoundException if book not found', async () => {
      txMock.user.findUnique.mockResolvedValue(mockUser);
      txMock.borrowing.count.mockResolvedValue(0);
      txMock.fine.count.mockResolvedValue(0);
      txMock.book.findUnique.mockResolvedValue(null);

      await expect(service.borrowBook('user-1', { bookId: 'book-1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no copies available', async () => {
      txMock.user.findUnique.mockResolvedValue(mockUser);
      txMock.borrowing.count.mockResolvedValue(0);
      txMock.fine.count.mockResolvedValue(0);
      txMock.book.findUnique.mockResolvedValue({ ...mockBook, availableCopies: 0 });
      txMock.borrowing.findFirst.mockResolvedValue(null);
      txMock.book.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.borrowBook('user-1', { bookId: 'book-1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('returnBook', () => {
    it('should successfully return a book', async () => {
      const borrowingWithUser = {
        ...mockBorrowing,
        userId: 'user-1',
        user: { id: 'user-1', role: 'STUDENT' },
        bookId: 'book-1',
        book: { id: 'book-1' },
      };
      txMock.borrowing.findUnique.mockResolvedValue(borrowingWithUser);
      txMock.book.update.mockResolvedValue({});
      txMock.reservation!.findFirst.mockResolvedValue(null);
      txMock.borrowing.update.mockResolvedValue({
        ...mockBorrowing,
        status: 'RETURNED',
        returnedAt: new Date(),
        book: { id: 'book-1', title: 'Test', author: 'Author' },
      });

      const result = await service.returnBook('user-1', { borrowingId: 'borrowing-1' });

      expect(result.message).toBeDefined();
      expect(result.borrowing.status).toBe('RETURNED');
    });

    it('should throw NotFoundException if borrowing not found', async () => {
      txMock.borrowing.findUnique.mockResolvedValue(null);

      await expect(
        service.returnBook('user-1', { borrowingId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('renewBorrowing', () => {
    it('should successfully renew a borrowing', async () => {
      const borrowingWithUser = { ...mockBorrowing, user: { id: 'user-1', role: 'STUDENT' }, book: { id: 'book-1' }, renewedCount: 0, maxRenewals: 2 };
      txMock.borrowing.findUnique.mockResolvedValue(borrowingWithUser);
      txMock.reservation!.findFirst.mockResolvedValue(null);
      txMock.borrowing.update.mockResolvedValue({ ...borrowingWithUser, renewedCount: 1 });

      const result = await service.renewBorrowing('user-1', { borrowingId: 'borrowing-1' });

      expect(result.message).toBeDefined();
      expect(result.borrowing.renewedCount).toBe(1);
    });

    it('should throw BadRequestException if max renewals reached', async () => {
      const borrowingWithUser = { ...mockBorrowing, user: { id: 'user-1', role: 'STUDENT' }, renewedCount: 2, maxRenewals: 2 };
      txMock.borrowing.findUnique.mockResolvedValue(borrowingWithUser);

      await expect(
        service.renewBorrowing('user-1', { borrowingId: 'borrowing-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyBorrowings', () => {
    it('should return user borrowings with pagination', async () => {
      txMock.borrowing.findMany.mockResolvedValue([mockBorrowing]);
      txMock.borrowing.count.mockResolvedValue(1);

      const result = await service.getMyBorrowings('user-1', {});

      expect(result.borrowings).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getOverdueBorrowings', () => {
    it('should return overdue borrowings', async () => {
      const overdueBorrowing = {
        ...mockBorrowing,
        status: 'ACTIVE',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };
      txMock.borrowing.findMany.mockResolvedValue([overdueBorrowing]);

      const result = await service.getOverdueBorrowings();

      expect(result).toHaveLength(1);
    });
  });
});
