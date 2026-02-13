import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Library Management System (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let studentToken: string;

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
    
    await app.init();

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@library.edu', password: 'admin123' });
    adminToken = adminLogin.body.accessToken;

    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'student@library.edu', password: 'student123' });
    studentToken = studentLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    describe('/api/v1/auth/login (POST)', () => {
      it('should login with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'admin@library.edu',
            password: 'admin123',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
          });
      });

      it('should fail with invalid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'admin@library.edu',
            password: 'wrongpassword',
          })
          .expect(401);
      });
    });

    describe('/api/v1/auth/profile (GET)', () => {
      it('should return user profile with valid token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.email).toBe('admin@library.edu');
          });
      });

      it('should fail without token', () => {
        return request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
      });
    });
  });

  describe('Books', () => {
    describe('/api/v1/books (GET)', () => {
      it('should return list of books', () => {
        return request(app.getHttpServer())
          .get('/api/v1/books')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('books');
          });
      });

      it('should search books by title', () => {
        return request(app.getHttpServer())
          .get('/api/v1/books?search=TypeScript')
          .expect(200);
      });
    });

    describe('/api/v1/books/:id (GET)', () => {
      it('should return a specific book', async () => {
        const listRes = await request(app.getHttpServer()).get('/api/v1/books');
        const bookId = listRes.body.books[0]?.id;
        
        if (bookId) {
          return request(app.getHttpServer())
            .get(`/api/v1/books/${bookId}`)
            .expect(200)
            .expect((res) => {
              expect(res.body).toHaveProperty('title');
            });
        }
      });
    });
  });

  describe('Borrowings', () => {
    describe('/api/v1/borrowings (GET)', () => {
      it('should return borrowings list as admin', () => {
        return request(app.getHttpServer())
          .get('/api/v1/borrowings')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should reject without token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/borrowings')
          .expect(401);
      });
    });

    describe('/api/v1/borrowings/my (GET)', () => {
      it('should return user borrowings', () => {
        return request(app.getHttpServer())
          .get('/api/v1/borrowings/my')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('borrowings');
          });
      });
    });
  });

  describe('Reservations', () => {
    describe('/api/v1/reservations (GET)', () => {
      it('should return reservations list as admin', () => {
        return request(app.getHttpServer())
          .get('/api/v1/reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
    });

    describe('/api/v1/reservations/my (GET)', () => {
      it('should return user reservations', () => {
        return request(app.getHttpServer())
          .get('/api/v1/reservations/my')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);
      });
    });
  });

  describe('Fines', () => {
    describe('/api/v1/fines (GET)', () => {
      it('should return fines list as admin', () => {
        return request(app.getHttpServer())
          .get('/api/v1/fines')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
    });

    describe('/api/v1/fines/my (GET)', () => {
      it('should return user fines', () => {
        return request(app.getHttpServer())
          .get('/api/v1/fines/my')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('fines');
            expect(res.body).toHaveProperty('summary');
          });
      });
    });
  });

  describe('Users', () => {
    describe('/api/v1/users (GET)', () => {
      it('should return users list as admin', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('users');
          });
      });

      it('should reject for non-admin', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);
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
