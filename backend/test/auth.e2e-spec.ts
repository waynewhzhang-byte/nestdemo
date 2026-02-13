import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import * as request from 'supertest';
import { setupTestApp, cleanupTestApp, testUsers, getAdminToken, getStudentToken } from './setup';

describe('Auth E2E Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('POST /auth/login', () => {
    it('should login with valid admin credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.admin.email,
          password: testUsers.admin.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUsers.admin.email);
    });

    it('should login with valid student credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.student.email,
          password: testUsers.student.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe(testUsers.student.email);
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.admin.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new student', async () => {
      const randomEmail = `test${Date.now()}@test.com`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: randomEmail,
          password: 'testpass123',
          name: 'Test User',
          role: 'STUDENT',
          studentId: `TEST${Date.now()}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should reject registration with existing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testUsers.admin.email,
          password: 'testpass123',
          name: 'Test User',
          role: 'STUDENT',
          studentId: 'TEST001',
        })
        .expect(409);

      expect(response.body.message).toContain('Email');
    });
  });

  describe('GET /auth/profile', () => {
    it('should get current user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body.email).toBe(testUsers.admin.email);
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });
});
