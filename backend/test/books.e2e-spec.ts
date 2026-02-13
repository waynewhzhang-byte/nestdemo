import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import * as request from 'supertest';
import { setupTestApp, cleanupTestApp, getAdminToken, getStudentToken } from './setup';

describe('Books E2E Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /books', () => {
    it('should return paginated list of books', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/books')
        .expect(200);

      expect(response.body).toHaveProperty('books');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.books)).toBe(true);
    });

    it('should filter books by search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/books?search=Clean')
        .expect(200);

      expect(response.body.books.length).toBeGreaterThan(0);
      response.body.books.forEach((book: any) => {
        const matchesSearch = 
          book.title.toLowerCase().includes('clean') ||
          book.author.toLowerCase().includes('clean');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter books by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/books?category=Programming')
        .expect(200);

      response.body.books.forEach((book: any) => {
        expect(book.category).toBe('Programming');
      });
    });
  });

  describe('GET /books/:id', () => {
    it('should return a single book with details', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/books');

      const bookId = listResponse.body.books[0].id;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/books/${bookId}`)
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('author');
      expect(response.body).toHaveProperty('isbn');
    });

    it('should return 404 for non-existent book', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/books/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /books (Admin only)', () => {
    it('should create a new book as admin', async () => {
      const newBook = {
        isbn: `ISBN-${Date.now()}`,
        title: 'Test Book',
        author: 'Test Author',
        publisher: 'Test Publisher',
        publishedYear: 2024,
        category: 'Testing',
        totalCopies: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/books')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send(newBook)
        .expect(201);

      expect(response.body.title).toBe(newBook.title);
    });

    it('should reject creation without admin token', async () => {
      const newBook = {
        isbn: `ISBN-${Date.now()}`,
        title: 'Test Book 2',
        author: 'Test Author',
        publisher: 'Test Publisher',
        publishedYear: 2024,
        category: 'Testing',
        totalCopies: 5,
      };

      await request(app.getHttpServer())
        .post('/api/v1/books')
        .send(newBook)
        .expect(401);
    });
  });

  describe('PUT /books/:id (Admin only)', () => {
    it('should update a book as admin', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/books');

      const bookId = listResponse.body.books[0].id;

      const response = await request(app.getHttpServer())
        .put(`/api/v1/books/${bookId}`)
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });
  });

  describe('DELETE /books/:id (Admin only)', () => {
    it('should delete a book as admin', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/books')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          isbn: `ISBN-DELETE-${Date.now()}`,
          title: 'Book to Delete',
          author: 'Author',
          publisher: 'Publisher',
          publishedYear: 2024,
          category: 'Test',
          totalCopies: 1,
        });

      const bookId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/books/${bookId}`)
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);
    });
  });
});
