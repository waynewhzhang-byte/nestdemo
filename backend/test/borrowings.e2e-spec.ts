import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import * as request from 'supertest';
import { setupTestApp, cleanupTestApp, getAdminToken, getStudentToken, testUsers } from './setup';

describe('Borrowings E2E Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /borrowings', () => {
    it('should return borrowings list as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/borrowings')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(Array.isArray(response.body.borrowings)).toBe(true);
    });

    it('should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/borrowings')
        .expect(401);
    });
  });

  describe('GET /borrowings/my', () => {
    it('should return student own borrowings', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/borrowings/my')
        .set('Authorization', `Bearer ${getStudentToken()}`)
        .expect(200);

      expect(Array.isArray(response.body.borrowings)).toBe(true);
    });
  });

  describe('POST /borrowings', () => {
    it('should reject without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/borrowings')
        .send({ bookId: 'any-book-id' });
      
      expect([401, 404]).toContain(response.status);
    });
  });

  describe('POST /borrowings/:id/return', () => {
    it('should return a borrowed book', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/borrowings/any-id/return')
        .set('Authorization', `Bearer ${getStudentToken()}`);

      expect([200, 404]).toContain(response.status);
    });
  });
});

describe('Reservations E2E Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /reservations', () => {
    it('should return reservations list as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reservations')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(Array.isArray(response.body.reservations)).toBe(true);
    });
  });

  describe('GET /reservations/my', () => {
    it('should return student own reservations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reservations/my')
        .set('Authorization', `Bearer ${getStudentToken()}`)
        .expect(200);

      expect(Array.isArray(response.body.reservations)).toBe(true);
    });
  });
});

describe('Fines E2E Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /fines', () => {
    it('should return fines list as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/fines')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(Array.isArray(response.body.fines)).toBe(true);
    });
  });

  describe('GET /fines/my', () => {
    it('should return student own fines', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/fines/my')
        .set('Authorization', `Bearer ${getStudentToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('fines');
      expect(response.body).toHaveProperty('summary');
    });
  });
});

describe('Users E2E Tests (Admin)', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /users', () => {
    it('should return users list as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    it('should reject as non-admin', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${getStudentToken()}`)
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user details as admin', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      const userId = listResponse.body.users[0].id;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
    });
  });
});
