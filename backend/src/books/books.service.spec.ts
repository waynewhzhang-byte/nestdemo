import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

type BookMock = {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
  groupBy: jest.Mock;
  aggregate: jest.Mock;
};

describe('BooksService', () => {
  let service: BooksService;
  let bookMock: BookMock;
  let borrowingCountMock: jest.Mock;

  const mockBook = {
    id: 'book-1',
    isbn: '978-0-123456-78-9',
    title: 'Test Book',
    author: 'Test Author',
    publisher: 'Test Publisher',
    publishedYear: 2024,
    category: 'Fiction',
    description: 'A test book',
    coverImage: null,
    location: 'A1',
    totalCopies: 5,
    availableCopies: 3,
    status: 'AVAILABLE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    bookMock = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    };
    borrowingCountMock = jest.fn();
    const mockPrisma = {
      book: bookMock,
      borrowing: { count: borrowingCountMock },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated list of books', async () => {
      const books = [mockBook];
      bookMock.findMany.mockResolvedValue(books);
      bookMock.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.books).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter by search query', async () => {
      bookMock.findMany.mockResolvedValue([mockBook]);
      bookMock.count.mockResolvedValue(1);

      await service.findAll({ search: 'Test', page: 1, limit: 10 });

      expect(bookMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a book by id', async () => {
      bookMock.findUnique.mockResolvedValue(mockBook);

      const result = await service.findOne('book-1');

      expect(result).toEqual(mockBook);
    });

    it('should throw NotFoundException if book not found', async () => {
      bookMock.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      isbn: '978-0-123456-78-9',
      title: 'New Book',
      author: 'New Author',
      publisher: 'Publisher',
      publishedYear: 2024,
      category: 'Fiction',
      description: 'Description',
      totalCopies: 5,
      location: 'A1',
    };

    it('should create a new book', async () => {
      bookMock.findUnique.mockResolvedValue(null);
      bookMock.create.mockResolvedValue(mockBook);

      const result = await service.create(createDto);

      expect(result).toEqual(mockBook);
    });
  });

  describe('update', () => {
    it('should update an existing book', async () => {
      const updateDto = { title: 'Updated Title' };
      bookMock.findUnique.mockResolvedValue(mockBook);
      bookMock.update.mockResolvedValue({ ...mockBook, ...updateDto });

      const result = await service.update('book-1', updateDto);

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException if book not found', async () => {
      bookMock.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a book when no active borrowings or reservations', async () => {
      const bookWithCount = {
        ...mockBook,
        _count: { borrowings: 0, reservations: 0 },
      };
      bookMock.findUnique.mockResolvedValue(bookWithCount);
      bookMock.delete.mockResolvedValue(mockBook);

      const result = await service.remove('book-1');

      expect(result).toEqual({ message: 'Book deleted successfully' });
      expect(bookMock.delete).toHaveBeenCalledWith({ where: { id: 'book-1' } });
    });

    it('should throw NotFoundException if book not found', async () => {
      bookMock.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return book statistics', async () => {
      bookMock.count.mockResolvedValue(100);
      bookMock.aggregate
        .mockResolvedValueOnce({ _sum: { totalCopies: 500 } })
        .mockResolvedValueOnce({ _sum: { availableCopies: 80 } });
      borrowingCountMock.mockResolvedValue(10);
      bookMock.groupBy.mockResolvedValue([
        { status: 'AVAILABLE', _count: { id: 60 } },
        { status: 'BORROWED', _count: { id: 40 } },
      ]);

      const result = await service.getStatistics();

      expect(result.totalBooks).toBe(100);
      expect(result.totalCopies).toBe(500);
      expect(result.availableCopies).toBe(80);
      expect(result.borrowedCopies).toBe(10);
    });
  });
});
