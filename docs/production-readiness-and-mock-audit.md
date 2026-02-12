# 项目生产就绪性与 Mock 审计报告

## 一、结论摘要

| 项目 | 结论 |
|------|------|
| **是否可投入生产** | **否**。存在前端 Mock 页面与静态页面，且缺少用户管理后端；需按「必须修复项」完成后才可上线。 |
| **业务 Mock 清单** | **存在**。共 3 处：Users 页（mock 用户列表）、Statistics 页（全页静态数据）、Profile 页（静态用户信息与借阅/罚款占位）。 |
| **后端业务 Mock** | **无**。仅测试文件（`*.spec.ts`）使用 Jest mock，生产代码无 mock。 |

---

## 二、Mock 与静态数据清单

### 2.1 前端仍在使用 Mock / 静态数据的页面

| 页面 | 文件 | 数据来源 | 说明 |
|------|------|----------|------|
| **Users** | `frontend/src/pages/Users.tsx` | `mockUsers` 数组（约 68–74 行） | 用户列表、统计、筛选、编辑弹窗均基于该数组；页面上有标注「Demo: This page shows mock data. User management API is not yet implemented.» |
| **Statistics** | `frontend/src/pages/Statistics.tsx` | 硬编码常量：`stats`、`topBorrowedBooks`、`categoryStats`、`monthlyTrends`、`recentActivity`（约 34–74 行） | 整页无任何 API 调用，所有图表与表格均为静态数据。 |
| **Profile** | `frontend/src/pages/Profile.tsx` | 硬编码：「John Doe」、邮箱、电话、地址、固定借阅历史数组、「No outstanding fines」 | 未调用 `authApi.getProfile()`、未调用借阅/罚款 API，全部为占位 UI。 |

### 2.2 已对接真实 API 的页面（无 Mock）

| 页面 | 使用的 API | 说明 |
|------|------------|------|
| **Dashboard** | `borrowingsApi.getMy()`、`finesApi.getMy()`、`statisticsApi.getDashboard()` | 学生/教师与管理员仪表盘数据均来自后端。 |
| **Books** | `booksApi.getAll()`、`booksApi.getCategories()`、`borrowingsApi.borrow()` | 列表、分类、分页、借书均为真实 API。 |
| **Borrowings** | `borrowingsApi.getMy()`、`return()`、`renew()` | 我的借阅、归还、续借均为真实 API。 |
| **Reservations** | `reservationsApi.getMy()`、`cancel()` | 我的预约与取消均为真实 API。 |
| **Login** | `authApi.login()`（经 useAuth） | 真实登录。 |
| **Register** | `authApi.register()`（经 useAuth） | 真实注册。 |

### 2.3 后端

- **生产代码**（`backend/src` 下非测试文件）：未发现返回 mock/fake/stub 或硬编码假数据的接口；所有 Controller 均委托给 Service，Service 使用 Prisma 访问数据库。
- **测试代码**（`*.spec.ts`）：使用 Jest mock（如 `mockPrisma`、`txMock`）属于正常单元测试，不视为业务 Mock。

---

## 三、生产就绪性检查

### 3.1 认证与安全

| 项目 | 状态 |
|------|------|
| JWT 认证 + Refresh Token | ✅ 已实现（POST /auth/refresh） |
| CORS（FRONTEND_URL） | ✅ 已配置，.env.example 已含 FRONTEND_URL |
| Helmet | ✅ 已启用 |
| 限流（Throttler） | ✅ 已启用（100 req/min） |
| 密码哈希（bcrypt） | ✅ 已使用 |
| 响应中排除 password | ✅ Auth 层已做 sanitize |

### 3.2 错误处理

| 项目 | 状态 |
|------|------|
| 后端全局异常 Filter | ✅ AllExceptionsFilter，含 Prisma 错误映射 |
| 前端 401 与 Refresh | ✅ axios 拦截器处理并重试 |
| 前端 ErrorBoundary | ✅ 已包裹应用 |
| 前端 Toast 报错 | ✅ 关键操作有失败提示 |

### 3.3 测试与质量

| 项目 | 状态 |
|------|------|
| 后端单元测试 | ✅ 29 个用例通过（auth、books、borrowings） |
| 后端 E2E | ⚠ 存在配置与用例，未在本次执行 |
| 前端单测 | ❌ 未配置 |

### 3.4 配置与文档

| 项目 | 状态 |
|------|------|
| .env.example（backend/frontend） | ✅ 存在，含关键变量与 FRONTEND_URL |
| 部署与迁移说明 | ✅ CLAUDE.md 中有部署与迁移说明 |

### 3.5 API 与数据完整性

| 项目 | 状态 |
|------|------|
| 用户管理后端（GET/POST/PUT/DELETE /users） | ❌ 未实现，导致 Users 页只能 Mock |
| 统计接口（/statistics/*） | ✅ 已实现，但 Statistics 页未调用 |
| 个人资料接口（GET/PUT /auth/profile） | ✅ 已实现，但 Profile 页未调用 |

---

## 四、必须修复项（阻塞生产）

1. **去除前端 Mock，改为真实 API**
   - **Users 页**：实现后端 Users 模块（GET/POST/PUT/DELETE /users、GET /users/:id），前端改为调用 `usersApi`，删除 `mockUsers` 及标注。
   - **Statistics 页**：改为使用 `statisticsApi.getDashboard()`、`getBorrowings()`、`getBooks()`、`getUsers()`、`getFines()`、`getTrends()` 等，删除所有硬编码 `stats`、`topBorrowedBooks`、`categoryStats`、`monthlyTrends`、`recentActivity`。
   - **Profile 页**：使用 `authApi.getProfile()` 展示当前用户，借阅历史与罚款可调用 `borrowingsApi.getMy()`、`finesApi.getMy()`，删除「John Doe」等静态占位。

2. **确认无遗漏 Mock**
   - 全仓库再次检索 `mock`/`MOCK`/硬编码假数组，仅允许测试文件（如 `*.spec.ts`）中的 Jest mock；业务页面与接口不得依赖任何 mock 数据。

---

## 五、建议改进项（非阻塞）

- 后端：将借阅规则（借阅天数、本数上限）与 `constants/index.ts` 对齐，避免在 BorrowingsService 中硬编码。
- 后端：Fine 模型支持部分缴纳（如增加 `paidAmount` 字段并修正 `getRemainingAmount`）。
- 前端：Statistics 页与后端统计 API 的字段与结构需逐项对齐（如 period、timeRange 等）。
- 测试：补充 E2E 回归与关键前端的单测，便于上线前验证。

---

## 六、后端 API 路由一览（均无 Mock）

以下路由均委托 Service + Prisma，无返回假数据：

- **Auth**: POST register, login, refresh；GET profile；PUT profile, password  
- **Health**: GET /, /liveness, /readiness  
- **Books**: GET /, /statistics, /categories, /isbn/:isbn, /:id；POST /；PUT /:id；POST /:id/adjust-inventory；DELETE /:id  
- **Borrowings**: POST borrow, return, renew；GET my, /, overdue, :id；POST mark-overdue  
- **Reservations**: POST /；GET my, /, :id；POST :id/cancel, :id/ready, :id/fulfill, expire-overdue；GET queue/:bookId  
- **Fines**: GET my, /, statistics, :id；POST :id/pay, :id/waive  
- **Statistics**: GET dashboard, borrowings, books, users, fines, trends  

---

**报告结论**：在完成「必须修复项」—— 实现用户管理后端、Users/Statistics/Profile 三页全部改为真实 API 并移除所有业务 mock/静态占位 —— 之后，项目方可视为无 Mock、可投入生产。当前状态为**不可投入生产**，且**存在 3 处业务 Mock/静态数据**（Users、Statistics、Profile）。
