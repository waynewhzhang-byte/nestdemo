# DDD 修复与领域事件实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复后端 4 项 DDD 违规问题，并基于业务流程定义 11 个领域事件（进程内异步 EventEmitter2）。

**Architecture:** Domain Service 在业务操作完成后通过 `EventEmitter2.emitAsync()` 异步分发事件；事件类定义在 `src/domain/events/`（无框架依赖）；处理器在 `src/application/event-handlers/` 中以 `@OnEvent()` 订阅。DDD 修复内容包括：常量 Bug、应用层直接 Prisma 访问、Prisma 枚举耦合、字符串匹配错误处理。

**Tech Stack:** NestJS, `@nestjs/event-emitter` (EventEmitter2), TypeScript, Jest, Prisma

**Design doc:** `docs/plans/2026-02-14-ddd-fixes-domain-events-design.md`

---

## Task 1: 安装 @nestjs/event-emitter 并注册模块

**Files:**
- Modify: `backend/package.json`（通过 npm install）
- Modify: `backend/src/app.module.ts`

**Step 1: 安装依赖**

```bash
cd backend && npm install @nestjs/event-emitter
```

Expected: package.json 中出现 `"@nestjs/event-emitter": "^2.x.x"`

**Step 2: 注册 EventEmitterModule**

在 `src/app.module.ts` 中：
```typescript
// 添加 import
import { EventEmitterModule } from '@nestjs/event-emitter';

// 在 @Module imports 数组中添加（ScheduleModule 之后）：
EventEmitterModule.forRoot({
  wildcard: false,
  delimiter: '.',
  maxListeners: 20,
  verboseMemoryLeak: true,
}),
```

**Step 3: 验证编译**
```bash
cd backend && npm run build
```
Expected: 编译成功，无错误。

**Step 4: Commit**
```bash
git add backend/package.json backend/package-lock.json backend/src/app.module.ts
git commit -m "feat: register EventEmitterModule for domain events"
```

---

## Task 2: 创建领域枚举，替换 Prisma 枚举耦合

**Files:**
- Create: `backend/src/domain/value-objects/enums.ts`
- Modify: `backend/src/domain/entities/book.entity.ts`
- Modify: `backend/src/domain/entities/borrowing.entity.ts`
- Modify: `backend/src/domain/entities/user.entity.ts`
- Modify: `backend/src/domain/entities/reservation.entity.ts`
- Modify: `backend/src/domain/entities/fine.entity.ts`
- Modify: `backend/src/domain/services/borrowing.domain-service.ts`（仅 import）
- Modify: `backend/src/domain/services/reservation.domain-service.ts`（仅 import）

**Step 1: 新建 enums.ts**

创建 `backend/src/domain/value-objects/enums.ts`：
```typescript
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  LOST = 'LOST',
}

export enum BorrowingStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  LOST = 'LOST',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  CANCELLED = 'CANCELLED',
  FULFILLED = 'FULFILLED',
  EXPIRED = 'EXPIRED',
}

export enum FineStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}
```

**Step 2: 更新 5 个实体的 import**

对每个实体文件，将：
```typescript
import { BookStatus } from "@prisma/client";
// 或 import { BorrowingStatus, Role } from "@prisma/client";
// 或 import { ReservationStatus } from "@prisma/client";
// 或 import { FineStatus } from "@prisma/client";
// 或 import { Role } from "@prisma/client";
```
改为从领域枚举导入：
```typescript
import { BookStatus } from "../value-objects/enums";
import { BorrowingStatus, UserRole as Role } from "../value-objects/enums";
// 等（保持变量名 Role 不变以减少改动量，或全部替换为 UserRole）
```

> **注意**：领域服务和基础设施层的 `toEntity()` 方法中，Prisma 返回的字符串值与领域枚举值相同（`'ACTIVE'` = `BorrowingStatus.ACTIVE`），可直接 `value as BorrowingStatus` cast，无需转换逻辑。

**Step 3: 编译验证**
```bash
cd backend && npm run build
```
Expected: 编译成功。

**Step 4: 运行现有测试，确保不破坏**
```bash
cd backend && npm test
```
Expected: 所有现有测试通过。

**Step 5: Commit**
```bash
git add backend/src/domain/
git commit -m "refactor: replace Prisma enums with domain-owned enums"
```

---

## Task 3: 创建领域异常类

**Files:**
- Create: `backend/src/domain/exceptions/index.ts`

**Step 1: 新建 domain exceptions**

创建 `backend/src/domain/exceptions/index.ts`：
```typescript
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DomainException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BookNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Book ${id} not found`, 'BOOK_NOT_FOUND');
  }
}

export class BookNotAvailableException extends DomainException {
  constructor(bookId: string) {
    super(`Book ${bookId} is not available for borrowing`, 'BOOK_NOT_AVAILABLE');
  }
}

export class BorrowingLimitExceededException extends DomainException {
  constructor(limit: number) {
    super(`Borrowing limit of ${limit} books reached`, 'BORROWING_LIMIT_EXCEEDED');
  }
}

export class UserInactiveException extends DomainException {
  constructor() {
    super('User account is not active', 'USER_INACTIVE');
  }
}

export class DuplicateBorrowingException extends DomainException {
  constructor() {
    super('Book is already borrowed by this user', 'DUPLICATE_BORROWING');
  }
}

export class BorrowingNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Borrowing ${id} not found`, 'BORROWING_NOT_FOUND');
  }
}

export class MaxRenewalsExceededException extends DomainException {
  constructor() {
    super('Maximum renewal count reached', 'MAX_RENEWALS_EXCEEDED');
  }
}

export class ReservationNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Reservation ${id} not found`, 'RESERVATION_NOT_FOUND');
  }
}

export class ReservationNotCancellableException extends DomainException {
  constructor(status: string) {
    super(`Reservation in status ${status} cannot be cancelled`, 'RESERVATION_NOT_CANCELLABLE');
  }
}

export class FineNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Fine ${id} not found`, 'FINE_NOT_FOUND');
  }
}

export class FineAlreadyPaidException extends DomainException {
  constructor() {
    super('Fine has already been paid', 'FINE_ALREADY_PAID');
  }
}
```

**Step 2: 写测试**

创建 `backend/src/domain/exceptions/exceptions.spec.ts`：
```typescript
import {
  DomainException,
  BookNotFoundException,
  BorrowingLimitExceededException,
  UserInactiveException,
} from './index';

describe('DomainExceptions', () => {
  it('DomainException should be instanceof Error', () => {
    const ex = new DomainException('msg', 'CODE');
    expect(ex).toBeInstanceOf(Error);
    expect(ex).toBeInstanceOf(DomainException);
    expect(ex.code).toBe('CODE');
    expect(ex.message).toBe('msg');
  });

  it('BookNotFoundException should be instanceof DomainException', () => {
    const ex = new BookNotFoundException('book-1');
    expect(ex).toBeInstanceOf(DomainException);
    expect(ex.code).toBe('BOOK_NOT_FOUND');
    expect(ex.message).toContain('book-1');
  });

  it('BorrowingLimitExceededException should include limit in message', () => {
    const ex = new BorrowingLimitExceededException(5);
    expect(ex.message).toContain('5');
  });

  it('instanceof check works correctly across inheritance chain', () => {
    const ex = new UserInactiveException();
    expect(ex instanceof DomainException).toBe(true);
    expect(ex instanceof Error).toBe(true);
  });
});
```

**Step 3: 运行测试**
```bash
cd backend && npx jest --testPathPattern=exceptions.spec -v
```
Expected: 4 tests PASS

**Step 4: Commit**
```bash
git add backend/src/domain/exceptions/
git commit -m "feat: add domain exception classes"
```

---

## Task 4: 修复 RESERVATION_EXPIRY_DAYS 常量 Bug

**Files:**
- Modify: `backend/src/domain/services/reservation.domain-service.ts`

**Step 1: 修复常量**

在 `reservation.domain-service.ts` 第 13 行，将：
```typescript
const RESERVATION_EXPIRY_DAYS = 7;
```
改为：
```typescript
const RESERVATION_EXPIRY_DAYS = 3;
```

**Step 2: 验证**
```bash
cd backend && grep -n "RESERVATION_EXPIRY_DAYS" src/domain/services/reservation.domain-service.ts src/constants/index.ts
```
Expected: 两处均为 `3`。

**Step 3: 运行相关测试**
```bash
cd backend && npm test
```
Expected: 所有测试通过。

**Step 4: Commit**
```bash
git add backend/src/domain/services/reservation.domain-service.ts
git commit -m "fix: correct RESERVATION_EXPIRY_DAYS from 7 to 3 days"
```

---

## Task 5: 扩展 Repository 接口 + 实现，消除应用层直接 Prisma 访问

**Files:**
- Modify: `backend/src/domain/repositories/borrowing.repository.interface.ts`
- Modify: `backend/src/domain/repositories/book.repository.interface.ts`
- Modify: `backend/src/infrastructure/repositories/prisma-borrowing.repository.ts`
- Modify: `backend/src/infrastructure/repositories/prisma-book.repository.ts`

**Step 1: 扩展 IBorrowingRepository**

在 `borrowing.repository.interface.ts` 中，`findOverdue()` 已存在，追加：
```typescript
markOverdue(ids: string[]): Promise<number>;
```

**Step 2: 扩展 IBookRepository**

在 `book.repository.interface.ts` 末尾追加：
```typescript
getStatistics(): Promise<{
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  byStatus: Record<string, number>;
}>;
```

**Step 3: 实现 markOverdue（PrismaBorrowingRepository）**

在 `prisma-borrowing.repository.ts` 末尾追加：
```typescript
async markOverdue(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await this.prisma.borrowing.updateMany({
    where: { id: { in: ids } },
    data: { status: 'OVERDUE' },
  });
  return result.count;
}
```

**Step 4: 实现 getStatistics（PrismaBookRepository）**

在 `prisma-book.repository.ts` 末尾追加：
```typescript
async getStatistics() {
  const [totalBooks, totalCopiesAgg, availableCopiesAgg, borrowedCopies, byStatus] =
    await Promise.all([
      this.prisma.book.count(),
      this.prisma.book.aggregate({ _sum: { totalCopies: true } }),
      this.prisma.book.aggregate({ _sum: { availableCopies: true } }),
      this.prisma.borrowing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.book.groupBy({ by: ['status'], _count: { id: true } }),
    ]);
  return {
    totalBooks,
    totalCopies: totalCopiesAgg._sum.totalCopies ?? 0,
    availableCopies: availableCopiesAgg._sum.availableCopies ?? 0,
    borrowedCopies,
    byStatus: byStatus.reduce(
      (acc, item) => { acc[item.status] = item._count.id; return acc; },
      {} as Record<string, number>,
    ),
  };
}
```

**Step 5: 编译验证**
```bash
cd backend && npm run build
```
Expected: 无编译错误（TypeScript 会确认接口实现完整）。

**Step 6: Commit**
```bash
git add backend/src/domain/repositories/ backend/src/infrastructure/repositories/
git commit -m "feat: extend repository interfaces with markOverdue and getStatistics"
```

---

## Task 6: 重构应用服务，移除直接 Prisma 调用 + 改用领域异常

**Files:**
- Modify: `backend/src/borrowings/borrowings.service.ts`
- Modify: `backend/src/books/books.service.ts`

**Step 1: 重构 borrowings.service.ts — getOverdueBorrowings()**

当前（行 216-227）直接查 Prisma，改为调用已有的 `IBorrowingRepository.findOverdue()`：
```typescript
async getOverdueBorrowings() {
  const overdue = await this.borrowingRepo.findOverdue();
  return overdue.map(b => b.toJSON());
}
```

> borrowings.service.ts 需要注入 `IBorrowingRepository`（通过 token `'IBorrowingRepository'`）—— 检查 borrowings.module.ts，确认已注入；若无则在构造函数中补充 `@Inject('IBorrowingRepository') private readonly borrowingRepo: IBorrowingRepository`。

**Step 2: 重构 borrowings.service.ts — markOverdueBorrowings()**

当前（行 236-248）直接 updateMany，改为：
```typescript
async markOverdueBorrowings() {
  const overdueBorrowings = await this.borrowingRepo.findOverdue();
  const ids = overdueBorrowings.map(b => b.id);
  const count = await this.borrowingRepo.markOverdue(ids);
  return {
    message: `Marked ${count} borrowing(s) as overdue`,
    updatedCount: count,
  };
}
```

**Step 3: 重构 borrowings.service.ts — 错误处理改用 instanceof**

找到 `borrowBook` 方法中的 catch 块（约行 54-62）：
```typescript
// 修改前（字符串匹配）
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  if (message.includes('not active')) throw new ForbiddenException(message);
  if (message.includes('reached the maximum')) throw new BadRequestException(message);
  // ...
  throw new InternalServerErrorException(message);
}

// 修改后（instanceof）
} catch (error) {
  if (error instanceof UserInactiveException) throw new ForbiddenException(error.message);
  if (error instanceof BorrowingLimitExceededException) throw new BadRequestException(error.message);
  if (error instanceof BookNotAvailableException) throw new ConflictException(error.message);
  if (error instanceof DuplicateBorrowingException) throw new ConflictException(error.message);
  if (error instanceof BorrowingNotFoundException) throw new NotFoundException(error.message);
  if (error instanceof MaxRenewalsExceededException) throw new BadRequestException(error.message);
  if (error instanceof DomainException) throw new BadRequestException(error.message);
  throw error;
}
```

同时在文件顶部添加 import：
```typescript
import {
  DomainException,
  UserInactiveException,
  BorrowingLimitExceededException,
  BookNotAvailableException,
  DuplicateBorrowingException,
  BorrowingNotFoundException,
  MaxRenewalsExceededException,
} from '../domain/exceptions';
```

**Step 4: 重构 books.service.ts — getStatistics()**

找到 `getStatistics()` 方法（行 210-236），改为：
```typescript
async getStatistics() {
  return this.bookRepo.getStatistics();
}
```

> books.service.ts 同样需要注入 `IBookRepository`（检查注入情况）。

**Step 5: 移除 borrowings.service.ts 中对 PrismaService 的依赖**

检查 constructor 中是否还有其他直接 `this.prisma.*` 用法（约行 36、72、104、139、156、174、184、194）—— 这些是正常的列表/详情查询，保持不变（仍可以通过 PrismaService 做），本次仅移除 `getOverdueBorrowings` 和 `markOverdueBorrowings` 的直接 Prisma 调用。

**Step 6: 编译验证**
```bash
cd backend && npm run build
```
Expected: 无编译错误。

**Step 7: 运行测试**
```bash
cd backend && npm test
```
Expected: 所有测试通过（需 mock 的地方已有 mock）。

**Step 8: Commit**
```bash
git add backend/src/borrowings/ backend/src/books/
git commit -m "refactor: remove direct Prisma queries from application services"
```

---

## Task 7: 更新 Domain Services 抛出领域异常

**Files:**
- Modify: `backend/src/domain/services/borrowing.domain-service.ts`
- Modify: `backend/src/domain/services/reservation.domain-service.ts`
- Modify: `backend/src/domain/services/fine.domain-service.ts`

**Step 1: borrowing.domain-service.ts 改为抛出领域异常**

在文件顶部添加：
```typescript
import {
  BookNotFoundException,
  BookNotAvailableException,
  BorrowingLimitExceededException,
  UserInactiveException,
  DuplicateBorrowingException,
  BorrowingNotFoundException,
  MaxRenewalsExceededException,
} from '../exceptions';
```

将所有 `throw new Error('...')` 替换为对应的领域异常，例如：
- `throw new Error('User is not active')` → `throw new UserInactiveException()`
- `throw new Error('User has reached the maximum...')` → `throw new BorrowingLimitExceededException(limit)`
- `throw new Error('Book is not available')` → `throw new BookNotAvailableException(params.bookId)`
- `throw new Error('Book not found')` → `throw new BookNotFoundException(params.bookId)`
- 续借的 `throw new Error('Maximum renewals reached')` → `throw new MaxRenewalsExceededException()`

**Step 2: reservation.domain-service.ts 改为抛出领域异常**

添加 import，替换 `throw new Error(...)` 为：
- `throw new BookNotFoundException(params.bookId)`
- `throw new ReservationNotCancellableException(reservation.status)`
- 等

**Step 3: fine.domain-service.ts 改为抛出领域异常**

添加 import，替换：
- `throw new Error('Fine not found')` → `throw new FineNotFoundException(id)`
- `throw new Error('Fine is already paid')` → `throw new FineAlreadyPaidException()`

**Step 4: 编译+测试**
```bash
cd backend && npm run build && npm test
```
Expected: 通过。

**Step 5: Commit**
```bash
git add backend/src/domain/services/
git commit -m "refactor: domain services throw typed domain exceptions"
```

---

## Task 8: 创建领域事件值对象

**Files:**
- Create: `backend/src/domain/events/borrowing.events.ts`
- Create: `backend/src/domain/events/reservation.events.ts`
- Create: `backend/src/domain/events/fine.events.ts`
- Create: `backend/src/domain/events/index.ts`

**Step 1: 创建 borrowing.events.ts**

```typescript
export class BookBorrowedEvent {
  static readonly EVENT_NAME = 'borrowing.borrowed';
  constructor(
    public readonly borrowingId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly dueDate: Date,
    public readonly borrowedAt: Date,
  ) {}
}

export class BookReturnedEvent {
  static readonly EVENT_NAME = 'borrowing.returned';
  constructor(
    public readonly borrowingId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly returnedAt: Date,
    public readonly hadFine: boolean,
    public readonly fineAmount?: number,
  ) {}
}

export class BorrowingRenewedEvent {
  static readonly EVENT_NAME = 'borrowing.renewed';
  constructor(
    public readonly borrowingId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly newDueDate: Date,
    public readonly renewedCount: number,
  ) {}
}

export class BorrowingBecameOverdueEvent {
  static readonly EVENT_NAME = 'borrowing.became_overdue';
  constructor(
    public readonly borrowingId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly dueDate: Date,
    public readonly daysOverdue: number,
  ) {}
}
```

**Step 2: 创建 reservation.events.ts**

```typescript
export class ReservationCreatedEvent {
  static readonly EVENT_NAME = 'reservation.created';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly expiresAt: Date,
  ) {}
}

export class ReservationReadyEvent {
  static readonly EVENT_NAME = 'reservation.ready';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly bookTitle: string,
  ) {}
}

export class ReservationExpiredEvent {
  static readonly EVENT_NAME = 'reservation.expired';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
  ) {}
}

export class ReservationCancelledEvent {
  static readonly EVENT_NAME = 'reservation.cancelled';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
  ) {}
}

export class ReservationFulfilledEvent {
  static readonly EVENT_NAME = 'reservation.fulfilled';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly borrowingId: string,
  ) {}
}
```

**Step 3: 创建 fine.events.ts**

```typescript
export class FineCreatedEvent {
  static readonly EVENT_NAME = 'fine.created';
  constructor(
    public readonly fineId: string,
    public readonly userId: string,
    public readonly borrowingId: string,
    public readonly amount: number,
    public readonly daysOverdue: number,
  ) {}
}

export class FinePaidEvent {
  static readonly EVENT_NAME = 'fine.paid';
  constructor(
    public readonly fineId: string,
    public readonly userId: string,
    public readonly amountPaid: number,
    public readonly paidAt: Date,
  ) {}
}
```

**Step 4: 创建 index.ts（re-export）**

```typescript
export * from './borrowing.events';
export * from './reservation.events';
export * from './fine.events';
```

**Step 5: Commit**
```bash
git add backend/src/domain/events/
git commit -m "feat: define domain event value objects"
```

---

## Task 9: 在 Domain Services 中 emit 事件

**Files:**
- Modify: `backend/src/domain/services/borrowing.domain-service.ts`
- Modify: `backend/src/domain/services/reservation.domain-service.ts`
- Modify: `backend/src/domain/services/fine.domain-service.ts`

**Step 1: 注入 EventEmitter2 到 BorrowingDomainService**

在构造函数中添加：
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BookBorrowedEvent,
  BookReturnedEvent,
  BorrowingRenewedEvent,
  BorrowingBecameOverdueEvent,
} from '../events';

// 构造函数参数增加：
constructor(
  private readonly borrowingRepo: IBorrowingRepository,
  private readonly bookRepo: IBookRepository,
  private readonly eventEmitter: EventEmitter2,
) {}
```

**Step 2: 在 borrowBook() 成功后 emit**

在 `borrowBook()` 保存成功后追加（在 return 前）：
```typescript
void this.eventEmitter.emitAsync(
  BookBorrowedEvent.EVENT_NAME,
  new BookBorrowedEvent(borrowing.id, params.userId, params.bookId, dueDate.value, new Date()),
);
```

**Step 3: 在 returnBook() 成功后 emit**

```typescript
void this.eventEmitter.emitAsync(
  BookReturnedEvent.EVENT_NAME,
  new BookReturnedEvent(
    params.borrowingId,
    borrowing.userId,
    borrowing.bookId,
    new Date(),
    !!fine,
    fine ? Number(fine.amount) : undefined,
  ),
);
```

**Step 4: 在 renewBorrowing() 成功后 emit**

```typescript
void this.eventEmitter.emitAsync(
  BorrowingRenewedEvent.EVENT_NAME,
  new BorrowingRenewedEvent(
    params.borrowingId,
    updatedBorrowing.userId,
    updatedBorrowing.bookId,
    newDueDate,
    updatedBorrowing.renewedCount,
  ),
);
```

**Step 5: 在 markOverdue() 中为每条逾期借阅 emit**

```typescript
// 在 markOverdue 方法中，找到逾期列表后
for (const borrowing of overdueBorrowings) {
  void this.eventEmitter.emitAsync(
    BorrowingBecameOverdueEvent.EVENT_NAME,
    new BorrowingBecameOverdueEvent(
      borrowing.id,
      borrowing.userId,
      borrowing.bookId,
      borrowing.dueDate,
      borrowing.getDaysOverdue(),
    ),
  );
}
```

**Step 6: ReservationDomainService 中 emit**

类似注入 EventEmitter2，在以下方法末尾 emit：
- `createReservation()` → `ReservationCreatedEvent`
- `cancelReservation()` → `ReservationCancelledEvent`
- `expireReservations()` → 每条 `ReservationExpiredEvent`
- `fulfillReservation()` → `ReservationFulfilledEvent`

**Step 7: FineDomainService 中 emit**

在 `payFine()` 成功后 emit `FinePaidEvent`。

**Step 8: 编译验证**
```bash
cd backend && npm run build
```
Expected: 无错误。

**Step 9: 更新现有单元测试（mock EventEmitter2）**

在 `borrowing.domain-service.spec.ts`（若存在）的 providers 中添加：
```typescript
{ provide: EventEmitter2, useValue: { emitAsync: jest.fn() } }
```

**Step 10: 运行所有测试**
```bash
cd backend && npm test
```
Expected: 通过。

**Step 11: Commit**
```bash
git add backend/src/domain/services/
git commit -m "feat: domain services emit domain events after state changes"
```

---

## Task 10: 创建事件处理器

**Files:**
- Create: `backend/src/application/event-handlers/borrowing.handler.ts`
- Create: `backend/src/application/event-handlers/reservation.handler.ts`
- Create: `backend/src/application/event-handlers/fine.handler.ts`
- Modify: `backend/src/borrowings/borrowings.module.ts`
- Modify: `backend/src/reservations/reservations.module.ts`
- Modify: `backend/src/fines/fines.module.ts`

**Step 1: 创建 BorrowingEventHandler**

```typescript
// backend/src/application/event-handlers/borrowing.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import {
  BookBorrowedEvent,
  BookReturnedEvent,
  BorrowingRenewedEvent,
  BorrowingBecameOverdueEvent,
} from '../../domain/events';
import { ReservationReadyEvent } from '../../domain/events';
import { IReservationRepository } from '../../domain/repositories/reservation.repository.interface';
import { IBookRepository } from '../../domain/repositories/book.repository.interface';

@Injectable()
export class BorrowingEventHandler {
  private readonly logger = new Logger(BorrowingEventHandler.name);

  constructor(
    @Inject('IReservationRepository')
    private readonly reservationRepo: IReservationRepository,
    @Inject('IBookRepository')
    private readonly bookRepo: IBookRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(BookBorrowedEvent.EVENT_NAME, { async: true })
  async handleBookBorrowed(event: BookBorrowedEvent): Promise<void> {
    this.logger.log(`Book borrowed: ${event.bookId} by user ${event.userId}, due ${event.dueDate.toISOString()}`);
  }

  @OnEvent(BookReturnedEvent.EVENT_NAME, { async: true })
  async handleBookReturned(event: BookReturnedEvent): Promise<void> {
    this.logger.log(`Book returned: ${event.bookId} by user ${event.userId}`);
    // 检查该书是否有 PENDING 预约 → emit reservation.ready
    const pending = await this.reservationRepo.findPendingByBookId(event.bookId);
    if (pending) {
      const book = await this.bookRepo.findById(event.bookId);
      void this.eventEmitter.emitAsync(
        ReservationReadyEvent.EVENT_NAME,
        new ReservationReadyEvent(
          pending.id,
          pending.userId,
          event.bookId,
          book?.title ?? '',
        ),
      );
    }
  }

  @OnEvent(BorrowingRenewedEvent.EVENT_NAME, { async: true })
  async handleBorrowingRenewed(event: BorrowingRenewedEvent): Promise<void> {
    this.logger.log(`Borrowing renewed: ${event.borrowingId}, new due date ${event.newDueDate.toISOString()}`);
  }

  @OnEvent(BorrowingBecameOverdueEvent.EVENT_NAME, { async: true })
  async handleBecameOverdue(event: BorrowingBecameOverdueEvent): Promise<void> {
    this.logger.warn(`Borrowing overdue: ${event.borrowingId}, ${event.daysOverdue} days overdue`);
  }
}
```

> 需要在 `IReservationRepository` 中添加 `findPendingByBookId(bookId: string): Promise<Reservation | null>` 方法（Task 10 Step 1b）。

**Step 1b: 扩展 IReservationRepository**

在 `reservation.repository.interface.ts` 中添加：
```typescript
findPendingByBookId(bookId: string): Promise<Reservation | null>;
```

在 `prisma-reservation.repository.ts` 中实现：
```typescript
async findPendingByBookId(bookId: string): Promise<Reservation | null> {
  const r = await this.prisma.reservation.findFirst({
    where: { bookId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  return r ? this.toEntity(r) : null;
}
```

**Step 2: 创建 ReservationEventHandler**

```typescript
// backend/src/application/event-handlers/reservation.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import {
  ReservationCreatedEvent,
  ReservationReadyEvent,
  ReservationExpiredEvent,
  ReservationCancelledEvent,
  ReservationFulfilledEvent,
} from '../../domain/events';
import { IReservationRepository } from '../../domain/repositories/reservation.repository.interface';
import { ReservationStatus } from '../../domain/value-objects/enums';

@Injectable()
export class ReservationEventHandler {
  private readonly logger = new Logger(ReservationEventHandler.name);

  constructor(
    @Inject('IReservationRepository')
    private readonly reservationRepo: IReservationRepository,
  ) {}

  @OnEvent(ReservationCreatedEvent.EVENT_NAME, { async: true })
  async handleCreated(event: ReservationCreatedEvent): Promise<void> {
    this.logger.log(`Reservation created: ${event.reservationId} for book ${event.bookId}`);
  }

  @OnEvent(ReservationReadyEvent.EVENT_NAME, { async: true })
  async handleReady(event: ReservationReadyEvent): Promise<void> {
    this.logger.log(`Reservation ready for pickup: ${event.reservationId}, book "${event.bookTitle}"`);
    // 更新预约状态为 READY，记录 notifiedAt
    const reservation = await this.reservationRepo.findById(event.reservationId);
    if (reservation && reservation.status === ReservationStatus.PENDING) {
      reservation.markReady();
      await this.reservationRepo.update(reservation);
    }
  }

  @OnEvent(ReservationExpiredEvent.EVENT_NAME, { async: true })
  async handleExpired(event: ReservationExpiredEvent): Promise<void> {
    this.logger.log(`Reservation expired: ${event.reservationId}`);
  }

  @OnEvent(ReservationCancelledEvent.EVENT_NAME, { async: true })
  async handleCancelled(event: ReservationCancelledEvent): Promise<void> {
    this.logger.log(`Reservation cancelled: ${event.reservationId}`);
  }

  @OnEvent(ReservationFulfilledEvent.EVENT_NAME, { async: true })
  async handleFulfilled(event: ReservationFulfilledEvent): Promise<void> {
    this.logger.log(`Reservation fulfilled: ${event.reservationId} → borrowing ${event.borrowingId}`);
  }
}
```

**Step 3: 创建 FineEventHandler**

```typescript
// backend/src/application/event-handlers/fine.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FineCreatedEvent, FinePaidEvent } from '../../domain/events';

@Injectable()
export class FineEventHandler {
  private readonly logger = new Logger(FineEventHandler.name);

  @OnEvent(FineCreatedEvent.EVENT_NAME, { async: true })
  async handleFineCreated(event: FineCreatedEvent): Promise<void> {
    this.logger.warn(
      `Fine created: ${event.fineId} for user ${event.userId}, amount $${event.amount} (${event.daysOverdue} days overdue)`,
    );
  }

  @OnEvent(FinePaidEvent.EVENT_NAME, { async: true })
  async handleFinePaid(event: FinePaidEvent): Promise<void> {
    this.logger.log(`Fine paid: ${event.fineId} by user ${event.userId}, amount $${event.amountPaid}`);
  }
}
```

**Step 4: 注册 Handler 到对应 Module**

在 `borrowings.module.ts` providers 数组中添加 `BorrowingEventHandler`：
```typescript
import { BorrowingEventHandler } from '../application/event-handlers/borrowing.handler';
// ...
providers: [..., BorrowingEventHandler],
```

在 `reservations.module.ts` 中添加 `ReservationEventHandler`（同时确保 `IBookRepository` 在该 module 可用，若未导入则 import `InfrastructureModule`）。

在 `fines.module.ts` 中添加 `FineEventHandler`。

**Step 5: 编译验证**
```bash
cd backend && npm run build
```
Expected: 无错误。

**Step 6: 运行所有测试**
```bash
cd backend && npm test
```
Expected: 所有测试通过。

**Step 7: Commit**
```bash
git add backend/src/application/ backend/src/borrowings/ backend/src/reservations/ backend/src/fines/ backend/src/domain/repositories/
git commit -m "feat: add domain event handlers for borrowing, reservation, and fine events"
```

---

## Task 11: 最终验证

**Step 1: 完整构建**
```bash
cd backend && npm run build
```
Expected: 编译成功，无错误，无警告。

**Step 2: 完整测试**
```bash
cd backend && npm test
```
Expected: 所有测试通过。

**Step 3: 检查关键修复是否生效**
```bash
# 常量修复验证
grep -n "RESERVATION_EXPIRY_DAYS" backend/src/domain/services/reservation.domain-service.ts
# Expected: = 3

# Prisma 枚举不再被领域层引用（仅 infrastructure 层允许）
grep -rn "from \"@prisma/client\"" backend/src/domain/
# Expected: 无输出（domain 层不再引用 @prisma/client）

# 应用层无直接 Prisma 查询（getStatistics / getOverdue / markOverdue 已迁移）
grep -n "this.prisma.borrowing.updateMany\|this.prisma.borrowing.findMany" backend/src/borrowings/borrowings.service.ts
# Expected: 无输出（这两个方法已迁移）
```

**Step 4: 最终 Commit（若 Step 3 全部通过）**
```bash
git add -A
git commit -m "feat: complete DDD fixes and domain events implementation"
```
