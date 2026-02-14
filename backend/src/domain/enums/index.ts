// Domain-owned enum types — no dependency on @prisma/client or any ORM
// Values are intentionally identical to Prisma enums so repositories can cast without mapping

export const BookStatus = {
  AVAILABLE: 'AVAILABLE',
  BORROWED: 'BORROWED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE',
  LOST: 'LOST',
} as const;
export type BookStatus = (typeof BookStatus)[keyof typeof BookStatus];

export const BorrowingStatus = {
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
  LOST: 'LOST',
} as const;
export type BorrowingStatus = (typeof BorrowingStatus)[keyof typeof BorrowingStatus];

export const ReservationStatus = {
  PENDING: 'PENDING',
  READY: 'READY',
  CANCELLED: 'CANCELLED',
  FULFILLED: 'FULFILLED',
  EXPIRED: 'EXPIRED',
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const FineStatus = {
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
} as const;
export type FineStatus = (typeof FineStatus)[keyof typeof FineStatus];

export const UserRole = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
