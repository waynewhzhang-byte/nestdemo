export const USER_ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
} as const;

export const BOOK_STATUS = {
  AVAILABLE: 'AVAILABLE',
  BORROWED: 'BORROWED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE',
  LOST: 'LOST',
} as const;

export const BORROWING_STATUS = {
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
  LOST: 'LOST',
} as const;

export const RESERVATION_STATUS = {
  PENDING: 'PENDING',
  READY: 'READY',
  CANCELLED: 'CANCELLED',
  FULFILLED: 'FULFILLED',
  EXPIRED: 'EXPIRED',
} as const;

export const FINE_STATUS = {
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
} as const;

export const BORROWING_LIMITS = {
  STUDENT: {
    maxBooks: 5,
    maxDays: 30,
    maxRenewals: 2,
  },
  TEACHER: {
    maxBooks: 10,
    maxDays: 90,
    maxRenewals: 2,
  },
} as const;

export const FINE_PER_DAY = 0.5;

export const RESERVATION_EXPIRY_DAYS = 3;
