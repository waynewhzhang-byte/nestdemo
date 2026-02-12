---
description: 
alwaysApply: true
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

School Library Management System — monorepo with a NestJS backend API and React frontend. The system manages books, borrowings, reservations, fines, and user roles (Student, Teacher, Admin).

## Repository Layout

```
backend/    — NestJS REST API (TypeScript, Prisma ORM, PostgreSQL)
frontend/   — React SPA (TypeScript, Vite, Tailwind CSS)
docs/plans/ — Design documents (Chinese)
```

## Commands

### Backend (run from `backend/`)

```bash
npm run start:dev          # Dev server with watch (port 3000)
npm run build              # Compile to dist/
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting
npm run test               # Run unit tests (Jest)
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests
npm run prisma:migrate     # Run database migrations
npm run prisma:generate    # Regenerate Prisma client after schema changes
npm run prisma:seed        # Seed database with test data
npm run prisma:studio      # Open Prisma Studio GUI
```

Single test file: `cd backend && npx jest --testPathPattern=auth.service`

### Frontend (run from `frontend/`)

```bash
npm run dev      # Vite dev server (port 5173)
npm run build    # Type-check + Vite production build
npm run lint     # ESLint
```

## Architecture

### Backend

- **Entry point**: `src/main.ts` — bootstraps NestJS with global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform), CORS, and Swagger docs at `/docs`
- **API prefix**: `/api/v1` (configurable via `API_PREFIX` env var)
- **Module pattern**: Each domain feature is a NestJS module under `src/` with its own controller, service, DTOs, and guards
- **Auth module** (fully implemented): JWT + Passport strategies, bcrypt password hashing, `@CurrentUser()` and `@Roles()` decorators, `JwtAuthGuard` and `RolesGuard`
- **Database**: Prisma ORM with PostgreSQL. Schema at `backend/prisma/schema.prisma`. Models: User, Book, Borrowing, Reservation, Fine
- **TypeScript path alias**: `@/*` maps to `src/*`
- **Security**: Helmet middleware for HTTP headers, `ThrottlerModule` (100 req/min by default). Auth: JWT access (15m) + refresh (7d), `POST /auth/refresh` for token rotation

### Frontend

- **React 19** with React Router v7, React Query for server state, React Hook Form + Zod for forms
- **UI components**: Radix UI primitives + class-variance-authority in `src/components/ui/`
- **Layout**: `Shell.tsx` wrapper with responsive `Sidebar.tsx` (fixed on desktop, overlay on mobile)
- **Auth**: Context-based via `useAuth()` hook in `src/hooks/useAuth.tsx`, tokens stored in localStorage
- **API client**: Axios instance in `src/services/api.ts` with auth interceptor and 401 refresh token rotation
- **Styling**: Tailwind CSS (mobile-first breakpoints)

### Business Rules (from `backend/src/constants/index.ts`)

- Student: max 5 books, 30-day loan, 2 renewals
- Teacher: max 10 books, 90-day loan, 2 renewals
- Fine: $0.50/day overdue
- Reservation expires after 3 days

## Environment Setup

Copy `.env.example` to `.env` in both `backend/` and `frontend/`. Key variables:

- **Backend**: `DATABASE_URL` (PostgreSQL connection string), `JWT_SECRET`, `JWT_EXPIRATION`, `PORT`, `API_PREFIX`, `FRONTEND_URL` (CORS allowed origin; required in production)
- **Frontend**: `VITE_API_URL` (e.g., `http://localhost:3000/api/v1`)

### Seed Credentials

- Admin: `admin@library.edu` / `admin123`
- Student: `student@library.edu` / `student123`
- Teacher: `teacher@library.edu` / `teacher123`

## Deployment & production

- **CORS**: Set `FRONTEND_URL` to the frontend origin (e.g. `https://app.example.com`) so the API accepts browser requests.
- **Database**: Run migrations before starting: `cd backend && npm run prisma:migrate` (or `prisma migrate deploy` in CI/production). Seed only in dev: `npm run prisma:seed`.
- **Security**: Helmet and Throttler are enabled. Use a strong `JWT_SECRET` in production; do not commit `.env`.

## Testing

- Backend uses Jest with ts-jest. Test files: `*.spec.ts` alongside source files. Config in `backend/package.json` under `"jest"` key.
- E2E test config expected at `backend/test/jest-e2e.json`.
- Frontend has no test setup yet.
