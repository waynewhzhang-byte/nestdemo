---
title: DDD 修复与领域事件设计
date: 2026-02-14
status: approved
version: 1.0
---

# DDD 修复与领域事件设计

## 1. 背景

本文档记录对学校图书馆管理系统后端 DDD 合规性问题的修复方案，以及基于项目设计文档定义的领域事件体系。

**修复范围（B 级）：**
1. 修复 `RESERVATION_EXPIRY_DAYS` 常量不一致 Bug
2. 将应用层直接 Prisma 查询下沉到 Repository
3. 用领域枚举替换 Prisma 枚举耦合
4. 引入领域异常类，替代字符串匹配错误处理

**领域事件：**
- 机制：进程内异步（NestJS EventEmitter2 `emitAsync`）
- 分发：Domain Service 在业务操作完成后发出
- 订阅：`src/application/event-handlers/` 中的 `@OnEvent()` 处理器

---

## 2. 整体架构

### 2.1 依赖流

```
Controller
  → AppService (borrowings.service.ts 等)
    → DomainService (borrowing.domain-service.ts 等)
      → Repository (IBorrowingRepository 接口)
        ← PrismaBorrowingRepository (基础设施实现)
      → EventEmitter2.emitAsync('event.name', payload)
        ← @OnEvent('event.name') EventHandler (异步，主流程不阻塞)
```

### 2.2 新增目录结构

```
backend/src/
├── domain/
│   ├── events/                        ← 新增：领域事件值对象
│   │   ├── index.ts
│   │   ├── borrowing.events.ts
│   │   ├── reservation.events.ts
│   │   └── fine.events.ts
│   ├── exceptions/                    ← 新增：领域异常类
│   │   └── index.ts
│   └── value-objects/
│       └── enums.ts                   ← 新增：领域枚举（替换 Prisma 枚举）
├── application/
│   └── event-handlers/                ← 新增：事件处理器
│       ├── borrowing.handler.ts
│       ├── reservation.handler.ts
│       └── fine.handler.ts
```

---

## 3. DDD 修复详情

### 3.1 修复常量 Bug

**文件**：`src/domain/services/reservation.domain-service.ts`

```typescript
// 修复前（错误）
const RESERVATION_EXPIRY_DAYS = 7;

// 修复后（与设计文档 §8.2 和 constants/index.ts 一致）
const RESERVATION_EXPIRY_DAYS = 3;
```

### 3.2 Repository 接口扩展（消除应用层直接 Prisma 访问）

在 `IBorrowingRepository` 增加：
```typescript
findOverdue(): Promise<Borrowing[]>;
markOverdue(ids: string[]): Promise<number>;
```

在 `IBookRepository` 增加：
```typescript
getStatistics(): Promise<{
  total: number;
  totalCopies: number;
  availableCopies: number;
  byCategory: { category: string; count: number }[];
  byStatus: { status: BookStatus; count: number }[];
}>;
```

对应 Prisma 实现在 `prisma-borrowing.repository.ts` 和 `prisma-book.repository.ts` 中补充。

`borrowings.service.ts` 和 `books.service.ts` 中的直接 `this.prisma.*` 调用改为通过注入的 Repository 接口调用。

### 3.3 领域枚举（`src/domain/value-objects/enums.ts`）

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

**迁移规则：**
- 所有 `src/domain/entities/*.ts` 从 `@prisma/client` 改为从 `../value-objects/enums` 导入枚举
- `src/domain/services/*.ts` 同步更新
- `src/infrastructure/repositories/prisma-*.repository.ts` 的 `toEntity()` 方法中加入 Prisma → Domain 枚举映射（值相同，直接 cast，无转换逻辑）

### 3.4 领域异常类（`src/domain/exceptions/index.ts`）

```typescript
export class DomainException extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainException';
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

export class MaxRenewalsExceededException extends DomainException {
  constructor() {
    super('Maximum renewal count reached', 'MAX_RENEWALS_EXCEEDED');
  }
}

export class ReservationNotCancellableException extends DomainException {
  constructor(status: string) {
    super(`Reservation in status ${status} cannot be cancelled`, 'RESERVATION_NOT_CANCELLABLE');
  }
}

export class FineAlreadyPaidException extends DomainException {
  constructor() {
    super('Fine has already been paid', 'FINE_ALREADY_PAID');
  }
}

export class BookNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Book ${id} not found`, 'BOOK_NOT_FOUND');
  }
}

export class BorrowingNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Borrowing ${id} not found`, 'BORROWING_NOT_FOUND');
  }
}
```

**Domain Services** 抛出领域异常；**Application Services** 捕获并映射到 HTTP 异常：
```typescript
// borrowings.service.ts
try {
  await this.borrowingDomainService.borrowBook(params);
} catch (error) {
  if (error instanceof UserInactiveException) throw new ForbiddenException(error.message);
  if (error instanceof BorrowingLimitExceededException) throw new BadRequestException(error.message);
  if (error instanceof BookNotAvailableException) throw new ConflictException(error.message);
  throw error; // 未知错误向上传播
}
```

---

## 4. 领域事件

### 4.1 EventEmitter2 配置

在 `AppModule` 中注册：
```typescript
EventEmitterModule.forRoot({
  wildcard: false,
  delimiter: '.',
  maxListeners: 20,
  verboseMemoryLeak: true,
}),
```

### 4.2 事件定义

#### `src/domain/events/borrowing.events.ts`

```typescript
export class BookBorrowedEvent {
  readonly eventName = 'borrowing.borrowed';
  constructor(
    public readonly borrowingId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly dueDate: Date,
    public readonly borrowedAt: Date,
  ) {}
}

export class BookReturnedEvent {
  readonly eventName = 'borrowing.returned';
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
  readonly eventName = 'borrowing.renewed';
  constructor(
    public readonly borrowingId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly newDueDate: Date,
    public readonly renewedCount: number,
  ) {}
}

export class BorrowingBecameOverdueEvent {
  readonly eventName = 'borrowing.became_overdue';
  constructor(
    public readonly borrowingId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly dueDate: Date,
    public readonly daysOverdue: number,
  ) {}
}
```

#### `src/domain/events/reservation.events.ts`

```typescript
export class ReservationCreatedEvent {
  readonly eventName = 'reservation.created';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly expiresAt: Date,
  ) {}
}

export class ReservationReadyEvent {
  readonly eventName = 'reservation.ready';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly bookTitle: string,
  ) {}
}

export class ReservationExpiredEvent {
  readonly eventName = 'reservation.expired';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
  ) {}
}

export class ReservationCancelledEvent {
  readonly eventName = 'reservation.cancelled';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
  ) {}
}

export class ReservationFulfilledEvent {
  readonly eventName = 'reservation.fulfilled';
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly bookId: string,
    public readonly borrowingId: string,
  ) {}
}
```

#### `src/domain/events/fine.events.ts`

```typescript
export class FineCreatedEvent {
  readonly eventName = 'fine.created';
  constructor(
    public readonly fineId: string,
    public readonly userId: string,
    public readonly borrowingId: string,
    public readonly amount: number,
    public readonly daysOverdue: number,
  ) {}
}

export class FinePaidEvent {
  readonly eventName = 'fine.paid';
  constructor(
    public readonly fineId: string,
    public readonly userId: string,
    public readonly amountPaid: number,
    public readonly paidAt: Date,
  ) {}
}
```

### 4.3 事件触发点

| 事件 | 触发位置 | 触发时机 |
|---|---|---|
| `borrowing.borrowed` | `BorrowingDomainService.borrowBook()` | Repository 保存成功后 |
| `borrowing.returned` | `BorrowingDomainService.returnBook()` | 归还完成后（含罚款信息） |
| `borrowing.renewed` | `BorrowingDomainService.renewBorrowing()` | 续借保存后 |
| `borrowing.became_overdue` | `BorrowingDomainService.markOverdue()` | Cron 批量标记后每条 emit |
| `reservation.created` | `ReservationDomainService.createReservation()` | 预约保存后 |
| `reservation.ready` | `BorrowingDomainService.returnBook()` 触发的 handler | 检测到待取预约后 |
| `reservation.expired` | `ReservationDomainService.expireReservations()` | Cron 批量过期后每条 emit |
| `reservation.cancelled` | `ReservationDomainService.cancelReservation()` | 取消保存后 |
| `reservation.fulfilled` | `ReservationDomainService.fulfillReservation()` | 履约保存后 |
| `fine.created` | `BorrowingDomainService.returnBook()` | 生成罚款后 |
| `fine.paid` | `FineDomainService.payFine()` | 缴款完成后 |

### 4.4 事件处理器职责

**`BorrowingEventHandler`**（`application/event-handlers/borrowing.handler.ts`）
- `borrowing.returned` → 查询该书是否有 PENDING 预约 → emit `reservation.ready`
- 其余事件 → 结构化日志记录（logger.log）

**`ReservationEventHandler`**（`application/event-handlers/reservation.handler.ts`）
- `reservation.ready` → 更新预约状态为 READY，记录 `notifiedAt`
- 其余事件 → 日志记录

**`FineEventHandler`**（`application/event-handlers/fine.handler.ts`）
- `fine.created` / `fine.paid` → 日志记录

---

## 5. 模块注册

`BorrowingsModule`、`ReservationsModule`、`FinesModule` 分别声明并导出对应 Handler。
所有 Handler 通过 NestJS DI 注入所需 Repository 接口。
`AppModule` 引入 `EventEmitterModule.forRoot()`。

---

## 6. 测试策略

- **Domain Services**：Mock EventEmitter2，验证 `emitAsync` 以正确参数被调用
- **Event Handlers**：Mock Repository，验证 handler 调用正确的 Repository 方法
- **集成**：现有 `*.spec.ts` 中补充 mock EventEmitter2 以避免真实事件分发干扰

---

## 7. 变更文件清单

| 文件 | 操作 |
|---|---|
| `src/domain/value-objects/enums.ts` | 新建 |
| `src/domain/exceptions/index.ts` | 新建 |
| `src/domain/events/borrowing.events.ts` | 新建 |
| `src/domain/events/reservation.events.ts` | 新建 |
| `src/domain/events/fine.events.ts` | 新建 |
| `src/domain/events/index.ts` | 新建（re-export） |
| `src/application/event-handlers/borrowing.handler.ts` | 新建 |
| `src/application/event-handlers/reservation.handler.ts` | 新建 |
| `src/application/event-handlers/fine.handler.ts` | 新建 |
| `src/domain/entities/*.ts`（5 个） | 修改：枚举导入源 |
| `src/domain/services/reservation.domain-service.ts` | 修改：常量 Bug + 领域异常 |
| `src/domain/services/borrowing.domain-service.ts` | 修改：领域异常 + emit 事件 |
| `src/domain/services/fine.domain-service.ts` | 修改：领域异常 + emit 事件 |
| `src/domain/repositories/borrowing.repository.interface.ts` | 修改：新增 findOverdue、markOverdue |
| `src/domain/repositories/book.repository.interface.ts` | 修改：新增 getStatistics |
| `src/infrastructure/repositories/prisma-borrowing.repository.ts` | 修改：实现新方法 |
| `src/infrastructure/repositories/prisma-book.repository.ts` | 修改：实现新方法 |
| `src/borrowings/borrowings.service.ts` | 修改：移除直接 Prisma、改 instanceof 错误处理 |
| `src/books/books.service.ts` | 修改：移除直接 Prisma 统计查询 |
| `src/borrowings/borrowings.module.ts` | 修改：注册 BorrowingEventHandler |
| `src/reservations/reservations.module.ts` | 修改：注册 ReservationEventHandler |
| `src/fines/fines.module.ts` | 修改：注册 FineEventHandler |
| `src/app.module.ts` | 修改：注册 EventEmitterModule |
| `backend/package.json` | 修改：添加 @nestjs/event-emitter 依赖 |
