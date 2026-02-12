import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Library Management System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let adminToken: string;
  let testBookId: string;
  let testBorrowingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    describe('/api/v1/auth/register (POST)', () => {
      it('should register a new student', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'student-test@school.edu',
            password: 'password123',
            name: 'Test Student',
            studentId: 'STU-TEST-001',
            role: 'STUDENT',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body.user.email).toBe('student-test@school.edu');
            authToken = res.body.accessToken;
          });
      });

      it('should register a new admin', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'admin-test@school.edu',
            password: 'password123',
            name: 'Test Admin',
            role: 'ADMIN',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body.user.role).toBe('ADMIN');
            adminToken = res.body.accessToken;
          });
      });

      it('should fail with duplicate email', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'student-test@school.edu',
            password: 'password123',
            name: 'Another Student',
            studentId: 'STU-TEST-002',
            role: 'STUDENT',
          })
          .expect(409);
      });

      it('should fail with invalid role', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'invalid@school.edu',
            password: 'password123',
            name: 'Invalid User',
            role: 'INVALID_ROLE',
          })
          .expect(400);
      });
    });

    describe('/api/v1/auth/login (POST)', () => {
      it('should login with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'student-test@school.edu',
            password: 'password123',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
          });
      });

      it('should fail with invalid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'student-test@school.edu',
            password: 'wrongpassword',
          })
          .expect(401);
      });

      it('should fail with non-existent user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@school.edu',
            password: 'password123',
          })
          .expect(401);
      });
    });

    describe('/api/v1/auth/profile (GET)', () => {
      it('should return user profile with valid token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.email).toBe('student-test@school.edu');
          });
      });

      it('should fail without token', () => {
        return request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
      });
    });
  });

  describe('Books', () => {
    describe('/api/v1/books (POST)', () => {
      it('should create a new book', () => {
        return request(app.getHttpServer())
          .post('/api/v1/books')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            isbn: '978-0-TEST-001',
            title: 'E2E Test Book',
            author: 'Test Author',
            publisher: 'Test Publisher',
            publishedYear: 2024,
            category: 'Testing',
            description: 'A book for e2e testing',
            totalCopies: 5,
            location: 'TEST-A1',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.title).toBe('E2E Test Book');
            expect(res.body.availableCopies).toBe(5);
            testBookId = res.body.id;
          });
      });

      it('should fail for non-admin users', () => {
        return request(app.getHttpServer())
          .post('/api/v1/books')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            isbn: '978-0-TEST-002',
            title: 'Another Book',
            author: 'Author',
            publisher: 'Publisher',
            publishedYear: 2024,
            category: 'Testing',
            totalCopies: 3,
          })
          .expect(403);
      });
    });

    describe('/api/v1/books (GET)', () => {
      it('should return list of books', () => {
        return request(app.getHttpServer())
          .get('/api/v1/books')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body.books) || Array.isArray(res.body)).toBe(true);
          });
      });

      it('should search books by title', () => {
        return request(app.getHttpServer())
          .get('/api/v1/books?search=E2E Test')
          .expect(200);
      });
    });

    describe('/api/v1/books/:id (GET)', () => {
      it('should return a specific book', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/books/${testBookId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(testBookId);
          });
      });

      it('should return 404 for non-existent book', () => {
        return request(app.getHttpServer())
          .get('/api/v1/books/non-existent-id')
          .expect(404);
      });
    });
  });

  describe('Borrowings', () => {
    describe('/api/v1/borrowings/borrow (POST)', () => {
      it('should borrow a book', () => {
        return request(app.getHttpServer())
          .post('/api/v1/borrowings/borrow')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ bookId: testBookId })
          .expect(201)
          .expect((res) => {
            expect(res.body.status).toBe('ACTIVE');
            testBorrowingId = res.body.id;
          });
      });

      it('should fail for non-existent book', () => {
        return request(app.getHttpServer())
          .post('/api/v1/borrowings/borrow')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ bookId: 'non-existent-id' })
          .expect(404);
      });
    });

    describe('/api/v1/borrowings/my (GET)', () => {
      it('should return user borrowings', () => {
        return request(app.getHttpServer())
          .get('/api/v1/borrowings/my')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
          });
      });
    });

    describe('/api/v1/borrowings/renew (POST)', () => {
      it('should renew a borrowing', () => {
        return request(app.getHttpServer())
          .post('/api/v1/borrowings/renew')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ borrowingId: testBorrowingId })
          .expect(201)
          .expect((res) => {
            expect(res.body.renewedCount).toBe(1);
          });
      });
    });

    describe('/api/v1/borrowings/return (POST)', () => {
      it('should return a book', () => {
        return request(app.getHttpServer())
          .post('/api/v1/borrowings/return')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ borrowingId: testBorrowingId })
          .expect(201)
          .expect((res) => {
            expect(res.body.status).toBe('RETURNED');
          });
      });
    });
  });

  describe('Health Check', () => {
    describe('/api/v1/health (GET)', () => {
      it('should return health status', () => {
        return request(app.getHttpServer())
          .get('/api/v1/health')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('status');
          });
      });
    });

    describe('/api/v1/health/liveness (GET)', () => {
      it('should return liveness status', () => {
        return request(app.getHttpServer())
          .get('/api/v1/health/liveness')
          .expect(200)
          .expect((res) => {
            expect(res.body.status).toBe('ok');
          });
      });
    });
  });

  describe('Statistics', () => {
    describe('/api/v1/statistics/dashboard (GET)', () => {
      it('should return dashboard statistics', () => {
        return request(app.getHttpServer())
          .get('/api/v1/statistics/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
    });
  });
});
