import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

let app: INestApplication;
let adminToken: string;
let studentToken: string;

export const testUsers = {
  admin: {
    email: 'admin@library.edu',
    password: 'admin123',
  },
  teacher: {
    email: 'teacher@library.edu',
    password: 'teacher123',
  },
  student: {
    email: 'student@library.edu',
    password: 'student123',
  },
};

export async function login(email: string, password: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });

  return response.body.accessToken;
}

export async function setupTestApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  
  const basePath = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(basePath);

  await app.init();

  // Login as admin and student for tests
  adminToken = await login(testUsers.admin.email, testUsers.admin.password);
  studentToken = await login(testUsers.student.email, testUsers.student.password);

  return app;
}

export function getAdminToken() {
  return adminToken;
}

export function getStudentToken() {
  return studentToken;
}

export async function cleanupTestApp() {
  await app.close();
}

export { app };
