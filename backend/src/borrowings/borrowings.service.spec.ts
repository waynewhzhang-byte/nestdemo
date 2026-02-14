import { Test, TestingModule } from '@nestjs/testing';
import { BorrowingsService } from './borrowings.service';
import { PrismaService } from '../prisma/prisma.service';
import { BorrowingDomainService } from '../domain/services/borrowing.domain-service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('BorrowingsService', () => {
  let service: BorrowingsService;
  let prismaMock: {
    borrowing: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let mockBorrowingDomainService: {
    borrowBook: jest.Mock;
    returnBook: jest.Mock;
    renewBook: jest.Mock;
  };

  const mockUser = { id: 'user-1', email: 'test@school.edu', role: 'STUDENT', isActive: true };
  const mockBook = { id: 'book-1', title: 'Test Book', author: 'Author', isbn: '123', availableCopies: 3, status: 'AVAILABLE' };
  const mockBorrowing = {
    id: 'borrowing-1',
    userId: 'user-1',
    bookId: 'book-1',
    borrowedAt: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    returnedAt: null,
    status: 'ACTIVE',
    renewedCount: 0,
    maxRenewals: 2,
    book: mockBook,
    user: mockUser,
  };

  beforeEach(async () => {
    prismaMock = {
      borrowing: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    mockBorrowingDomainService = {
      borrowBook: jest.fn(),
      returnBook: jest.fn(),
      renewBook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BorrowingDomainService, useValue: mockBorrowingDomainService },
      ],
    }).compile();

    service = module.get<BorrowingsService>(BorrowingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('borrowBook', () => {
    it('should successfully borrow a book', async () => {
      mockBorrowingDomainService.borrowBook.mockResolvedValue({ message: 'Book borrowed successfully', borrowing: {} });
      prismaMock.borrowing.findFirst.mockResolvedValue({
        ...mockBorrowing,
        book: { id: 'book-1', title: 'Test Book', author: 'Author', isbn: '123' },
      });

      const result = await service.borrowBook('user-1', { bookId: 'book-1' });

      expect(result.message).toBeDefined();
      expect(result.borrowing.status).toBe('ACTIVE');
    });

    it('should throw NotFoundException if book not found', async () => {
      mockBorrowingDomainService.borrowBook.mockRejectedValue(new Error('Book not found'));

      await expect(service.borrowBook('user-1', { bookId: 'book-1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if book already borrowed', async () => {
      mockBorrowingDomainService.borrowBook.mockRejectedValue(new Error('You have already borrowed this book'));

      await expect(service.borrowBook('user-1', { bookId: 'book-1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('returnBook', () => {
    it('should successfully return a book', async () => {
      mockBorrowingDomainService.returnBook.mockResolvedValue({ message: 'Book returned successfully', borrowing: {} });
      prismaMock.borrowing.findUnique.mockResolvedValue({
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
      mockBorrowingDomainService.returnBook.mockRejectedValue(new Error('Borrowing record not found'));

      await expect(
        service.returnBook('user-1', { borrowingId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('renewBorrowing', () => {
    it('should successfully renew a borrowing', async () => {
      mockBorrowingDomainService.renewBook.mockResolvedValue({ message: 'Borrowing renewed successfully', borrowing: {} });
      prismaMock.borrowing.findUnique.mockResolvedValue({ ...mockBorrowing, renewedCount: 1, maxRenewals: 2 });

      const result = await service.renewBorrowing('user-1', { borrowingId: 'borrowing-1' });

      expect(result.message).toBeDefined();
      expect(result.borrowing.renewedCount).toBe(1);
    });

    it('should throw BadRequestException if max renewals reached', async () => {
      mockBorrowingDomainService.renewBook.mockRejectedValue(new Error('This borrowing cannot be renewed'));

      await expect(
        service.renewBorrowing('user-1', { borrowingId: 'borrowing-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyBorrowings', () => {
    it('should return user borrowings with pagination', async () => {
      prismaMock.borrowing.findMany.mockResolvedValue([mockBorrowing]);
      prismaMock.borrowing.count.mockResolvedValue(1);

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
      prismaMock.borrowing.findMany.mockResolvedValue([overdueBorrowing]);

      const result = await service.getOverdueBorrowings();

      expect(result).toHaveLength(1);
    });
  });
});
