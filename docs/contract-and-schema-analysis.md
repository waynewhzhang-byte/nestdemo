# Prisma Schema、后端 API 契约与前后端契约匹配分析

## 一、Prisma Schema 与项目核心需求

### 1.1 与设计文档的一致性

| 需求 | Schema 现状 | 结论 |
|------|-------------|------|
| 用户 (User) | 含 id, email, password, name, role, studentId, teacherId, phone, isActive, createdAt, updatedAt | ✅ 满足 |
| 图书 (Book) | 含 isbn 唯一、复本 totalCopies/availableCopies、status、分类/位置等 | ✅ 满足 |
| 借阅 (Borrowing) | 含 userId, bookId, borrowedAt, dueDate, returnedAt, status, renewedCount, maxRenewals | ✅ 满足 |
| 预约 (Reservation) | 含 status, expiresAt, notifiedAt, fulfilledAt | ✅ 满足 |
| 罚款 (Fine) | 含 borrowingId 唯一、amount, reason, status, paidAt | ⚠ 见下 |

### 1.2 Schema 缺口与建议

1. **软删除**  
   - 设计/规范要求重要实体使用软删除（如 `deletedAt`）。  
   - 当前 User、Book 等均无 `deletedAt`，删除为物理删除。  
   - **建议**：若需“禁用用户/下架图书可恢复”，为 User、Book 等增加 `deletedAt DateTime?` 并在查询中过滤。

2. **罚款部分缴纳 (PARTIAL)**  
   - Fine 仅有 `amount`（应缴总额）和 `status`（UNPAID/PARTIAL/PAID），无“已缴金额”字段。  
   - 后端 `getRemainingAmount()` 在 PARTIAL 时仍返回 `Number(fine.amount)`，无法正确表示剩余金额。  
   - **建议**：增加 `paidAmount Decimal? @db.Decimal(10,2)`（或同等含义字段），PARTIAL 时剩余 = amount - paidAmount。

3. **借阅期限与限额的存储**  
   - 业务规则（constants）：学生 5 本/30 天，教师 10 本/90 天。  
   - Schema 未存“单次借阅天数”，Borrowing 只有 `dueDate`；限额由角色在业务层计算，Schema 无需改。  
   - **注意**：后端 BorrowingsService 当前使用硬编码 3/5 本、14 天，与 constants 不一致，应在服务层统一使用 `constants/index.ts` 的 BORROWING_LIMITS 与期限。

### 1.3 索引与关系

- User/Book/Borrowing/Reservation/Fine 关系与设计一致，外键、唯一约束合理。  
- 已有索引：Book(category, title)、Borrowing(userId, bookId, status)、Reservation(userId, bookId, status)，满足列表/筛选需求。

**结论**：Schema 整体满足核心领域模型；建议补足 Fine 部分缴纳字段、并按需增加软删除；业务规则（借阅天数/本数）应在服务层与 constants 对齐，无需改 Schema。

---

## 二、后端 API 契约完整性（无 Mock 视角）

### 2.1 与设计文档 API 的对照

| 设计文档 | 当前后端 | 状态 |
|----------|----------|------|
| **Auth** | | |
| POST /auth/register | ✅ POST /auth/register | 一致 |
| POST /auth/login | ✅ POST /auth/login | 一致 |
| POST /auth/refresh | ✅ POST /auth/refresh | 一致 |
| POST /auth/logout | ❌ 无 | 可选（JWT 无状态可不做） |
| GET /auth/profile | ✅ GET /auth/profile | 一致 |
| PUT /auth/profile | ✅ PUT /auth/profile | 一致 |
| PUT /auth/password | ✅ PUT /auth/password | 一致 |
| **Books** | | |
| GET /books | ✅ GET /books (分页/筛选/搜索) | 一致 |
| GET /books/:id | ✅ GET /books/:id | 一致 |
| GET /books/categories | ✅ GET /books/categories | 一致 |
| GET /books/:id/availability | ❌ 无 | 可用 GET /books/:id 的 availableCopies 替代 |
| POST/PUT/DELETE /books | ✅ 有，含 POST /books/:id/adjust-inventory | 等价于设计中的 stock |
| **Borrowings** | | |
| GET /borrowings (我的) | ✅ GET /borrowings/my | 路径不同、语义一致 |
| GET /borrowings/:id | ✅ GET /borrowings/:id | 一致 |
| POST /borrowings | ✅ POST /borrowings/borrow，body: { bookId } | 一致 |
| POST /borrowings/:id/return | ✅ POST /borrowings/return，body: { borrowingId } | 语义一致，契约为 body 而非 path |
| POST /borrowings/:id/renew | ✅ POST /borrowings/renew，body: { borrowingId } | 同上 |
| Admin 全部借阅 | ✅ GET /borrowings (Admin/Teacher) | 一致 |
| 逾期列表 | ✅ GET /borrowings/overdue | 一致 |
| **Reservations** | | |
| GET/POST /reservations | ✅ GET /reservations/my、GET /reservations、POST /reservations | 一致 |
| 取消预约 | ✅ POST /reservations/:id/cancel | 设计为 DELETE，实现为 POST，语义一致 |
| Admin 状态更新 | ✅ POST /reservations/:id/ready、/fulfill | 一致 |
| **Fines** | | |
| GET /fines (我的) | ✅ GET /fines/my | 一致 |
| POST /fines/:id/pay | ✅ POST /fines/:id/pay，body: PayFineDto { amount } | 一致 |
| Admin 列表/编辑/删除 | ✅ GET /fines、POST /fines/:id/waive；❌ 无 PUT/DELETE /fines/:id | 部分一致，缺编辑/删除 |
| **Users（设计为 ADMIN ONLY）** | | |
| GET/POST/PUT/DELETE /users | ❌ 无 Users 模块 | **缺失** |
| GET /users/:id/borrowings | ❌ 无 | **缺失** |
| **Statistics** | | |
| GET /stats/* | ✅ GET /statistics/dashboard、borrowings、books、users、fines、trends | 路径为 statistics 非 stats，语义一致 |

### 2.2 后端契约缺口汇总

- **必须补（核心需求）**  
  - **Users 模块**：GET/POST/PUT/DELETE /users、GET /users/:id（及可选 GET /users/:id/borrowings），否则“用户管理”无法脱离 Mock。

- **建议补**  
  - GET /books/:id/availability：若前端需要“仅查可借数量”的轻量接口可加；当前可用 GET /books/:id 替代。  
  - Fines：若需编辑/删除罚款，补 PUT /fines/:id、DELETE /fines/:id（或等价能力）。

- **可选**  
  - POST /auth/logout：若要做服务端黑名单或审计再实现。

### 2.3 响应体格式

- 设计文档期望统一包装：`{ success: true, data: T, meta?: { page, limit, total } }`。  
- 当前后端多为“直接资源体”（如 `{ books, pagination }`、`{ borrowings, pagination }`），未包一层 `success/data/meta`。  
- **结论**：契约可用，但与设计文档约定不一致；若希望前后端严格按文档，需在后端统一包装或在前端适配当前形状。

---

## 三、前端与后端契约匹配情况

### 3.1 路径与方法

| 前端 api.ts | 后端 | 匹配 |
|-------------|------|------|
| authApi.* | /auth/* | ✅ |
| booksApi.* | /books/* | ✅ |
| borrowingsApi.borrow(bookId) → POST body { bookId } | BorrowBookDto | ✅ |
| borrowingsApi.return(borrowingId) → POST body { borrowingId } | ReturnBookDto | ✅ |
| borrowingsApi.renew(borrowingId) → POST body { borrowingId } | RenewBorrowingDto | ✅ |
| reservationsApi.* | /reservations/* | ✅ |
| finesApi.* | /fines/* | ✅ |
| statisticsApi.* | /statistics/* | ✅ |

路径与方法、body 形状一致；ID 均为 string（UUID），前后端一致。

### 3.2 响应体形状与前端使用

| 接口 | 后端返回 | 前端使用 | 匹配 |
|------|----------|----------|------|
| GET /books | { books, pagination: { page, limit, total, totalPages } } | data.books, data.pagination | ✅ |
| GET /books/:id | Book | 未在列表中用 getById，若用则一致 | ✅ |
| GET /borrowings/my | { borrowings, pagination } | data.borrowings | ✅ |
| GET /reservations/my | { reservations, pagination } | data.reservations | ✅ |
| GET /fines/my | { fines, pagination, summary: { totalUnpaidAmount, grandTotal }, estimatedFines } | Dashboard 用 summary.grandTotal / totalUnpaidAmount | ✅ |
| GET /statistics/dashboard | { books, users, borrowings, reservations, fines, period } | books.total、borrowings.active 等 | ✅ |

当前已用到的接口，前后端数据结构匹配。

### 3.3 不匹配或潜在问题

1. **POST /fines/:id/pay**  
   - 后端：必填 body `PayFineDto { amount: number }`。  
   - 前端：`finesApi.pay(id: string)` 未传 body，调用会因校验失败报错。  
   - **建议**：前端改为 `pay(id: string, amount: number)` 或 `pay(id: string, dto: { amount: number })`，并传 body。

2. **POST /reservations**  
   - 后端：body `CreateReservationDto { bookId: string }`。  
   - 前端：`create(bookId: string)` → post('/reservations', { bookId })。  
   - 匹配 ✅。

3. **statisticsApi.getTrends(params?: { months?: number })**  
   - 后端：GET /statistics/trends 无 query 参数，固定最近 6 个月。  
   - 前端传 `months` 目前无效，但不影响现有功能；若需“可配置月数”需后端支持 query。

4. **Users 模块**  
   - 前端无 usersApi，Users 页为 Mock；一旦实现后端 Users API，需在前端新增 usersApi 并与页面对接。

### 3.4 前端未用到的后端能力

- borrowingsApi.getAll、getOverdue：后端已实现，前端未在页面调用（如管理端借阅/逾期列表）。  
- finesApi.getAll、getStatistics：同上，管理端可用。  
- booksApi.getById：前端列表未跳详情页或未请求单本，若后续做详情页需用此接口。  
- reservationsApi.getAll、markReady、fulfill：管理端预约管理可用。  
- statisticsApi.getBorrowings、getBooks、getUsers、getFines、getTrends：Statistics 页若需细分统计可对接。

---

## 四、总结与建议

### 4.1 Prisma Schema

- **结论**：满足当前核心需求；与设计文档模型一致。  
- **建议**：  
  - Fine 增加 `paidAmount`（或等价）以正确支持 PARTIAL；  
  - 若需软删除，为 User/Book 等增加 `deletedAt`；  
  - 借阅天数/本数在 BorrowingsService 中与 `constants/index.ts` 对齐（学生 5 本/30 天，教师 10 本/90 天），而不是硬编码 3/5 本、14 天。

### 4.2 后端 API 契约

- **结论**：书籍、借阅、预约、罚款、统计、认证等核心契约完整且可用，无需 Mock 即可支撑现有前端（除用户管理）。  
- **缺口**：  
  - **Users 模块**：需实现 GET/POST/PUT/DELETE /users 及 GET /users/:id（和可选 /users/:id/borrowings），才能去掉 Users 页 Mock。  
  - 可选：GET /books/:id/availability；Fines 的 PUT/DELETE；POST /auth/logout。

### 4.3 前后端契约匹配

- **结论**：已对接的接口在路径、方法、ID 类型和主要响应形状上一致，无 Mock 依赖。  
- **必须修**：  
  - **finesApi.pay**：前端需传 `amount`（或完整 PayFineDto），与后端 PayFineDto 一致。  
- **建议**：  
  - 为管理端页面对接 borrowingsApi.getAll/getOverdue、finesApi.getAll/getStatistics、reservationsApi.getAll/markReady/fulfill 等；  
  - 若要做“图书详情页”，用 booksApi.getById；  
  - 若要做“用户管理”，实现后端 Users 后新增 usersApi 并替换 Users 页 Mock。

完成上述 Schema 与 Fine 部分缴纳、借阅规则常量统一、finesApi.pay 传参、以及 Users 模块与前端对接后，Schema 与前后端契约即可在“无 Mock”前提下满足项目核心需求并保持一致。
