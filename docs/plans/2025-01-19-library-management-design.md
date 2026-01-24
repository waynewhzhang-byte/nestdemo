---
title: 学校图书馆管理系统设计文档
date: 2025-01-19
status: approved
version: 1.0
authors:
  - Zhuanz
---

# 学校图书馆管理系统设计文档

## 1. 项目概述

### 1.1 背景
为学校构建一个完整的图书馆管理系统，支持学生、教师借阅图书，管理员进行后台管理。

### 1.2 技术栈
- **后端**: NestJS + TypeScript + Prisma + PostgreSQL
- **前端**: React + TypeScript + Tailwind CSS + Radix UI
- **认证**: JWT (JSON Web Token)
- **数据库**: PostgreSQL

### 1.3 用户角色
| 角色 | 权限范围 |
|------|----------|
| STUDENT | 借阅/归还/预约/搜索，限借 5 本，期限 30 天 |
| TEACHER | 同学生权限，限借 10 本，期限 90 天 |
| ADMIN | 完整管理权限：图书/用户/借阅/预约/罚款/统计 |

## 2. 系统架构

### 2.1 项目结构 (Monorepo)

```
nestdemo/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── auth/           # 认证模块 (JWT)
│   │   ├── users/          # 用户管理
│   │   ├── books/          # 图书编目
│   │   ├── borrowings/     # 借阅/归还
│   │   ├── reservations/   # 预约预借
│   │   ├── fines/          # 罚款管理
│   │   ├── statistics/     # 统计报表
│   │   └── common/         # 公共模块 (guards, decorators, filters)
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   └── test/
├── frontend/               # React 前端
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── hooks/          # 自定义 hooks
│   │   ├── services/       # API 调用层
│   │   ├── stores/         # 状态管理
│   │   ├── types/          # TypeScript 类型
│   │   └── utils/          # 工具函数
│   └── test/
└── docs/                   # 文档
    └── plans/
```

### 2.2 数据库模型 (Prisma Schema)

```prisma
// Users 用户表
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  password     String
  name         String
  role         Role     @default(STUDENT)
  studentId    String?  @unique  // 学生学号
  teacherId    String?  @unique  // 教师工号
  phone        String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  borrowings   Borrowing[]
  reservations Reservation[]
  fines        Fine[]

  @@map("users")
}

enum Role {
  STUDENT
  TEACHER
  ADMIN
}

// Books 图书表
model Book {
  id              String   @id @default(uuid())
  isbn            String   @unique
  title           String
  author          String
  publisher       String
  publishedYear   Int
  category        String
  description     String?
  coverImage      String?
  location        String?  // 书架位置
  totalCopies     Int      @default(1)
  availableCopies Int      @default(1)
  status          BookStatus @default(AVAILABLE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  borrowings      Borrowing[]
  reservations    Reservation[]

  @@index([category])
  @@index([title])
  @@map("books")
}

enum BookStatus {
  AVAILABLE
  BORROWED
  RESERVED
  MAINTENANCE
  LOST
}

// Borrowings 借阅记录表
model Borrowing {
  id           String        @id @default(uuid())
  userId       String
  bookId       String
  borrowedAt   DateTime      @default(now())
  dueDate      DateTime
  returnedAt   DateTime?
  status       BorrowingStatus @default(ACTIVE)
  renewedCount Int           @default(0)
  maxRenewals  Int           @default(2)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  user         User          @relation(fields: [userId], references: [id])
  book         Book          @relation(fields: [bookId], references: [id])
  fine         Fine?

  @@index([userId])
  @@index([bookId])
  @@index([status])
  @@map("borrowings")
}

enum BorrowingStatus {
  ACTIVE
  RETURNED
  OVERDUE
  LOST
}

// Reservations 预约表
model Reservation {
  id          String            @id @default(uuid())
  userId      String
  bookId      String
  status      ReservationStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  expiresAt   DateTime
  notifiedAt  DateTime?
  fulfilledAt DateTime?

  user        User              @relation(fields: [userId], references: [id])
  book        Book              @relation(fields: [bookId], references: [id])

  @@index([userId])
  @@index([bookId])
  @@index([status])
  @@map("reservations")
}

enum ReservationStatus {
  PENDING
  READY
  CANCELLED
  FULFILLED
  EXPIRED
}

// Fines 罚款表
model Fine {
  id          String    @id @default(uuid())
  borrowingId String    @unique
  userId      String
  amount      Decimal   @db.Decimal(10, 2)
  reason      String
  status      FineStatus @default(UNPAID)
  paidAt      DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  borrowing   Borrowing @relation(fields: [borrowingId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@map("fines")
}

enum FineStatus {
  UNPAID
  PARTIAL
  PAID
}
```

## 3. API 设计

### 3.1 认证模块 (Auth)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/auth/register` | 用户注册 | 公开 |
| POST | `/auth/login` | 登录 | 公开 |
| POST | `/auth/refresh` | 刷新 Token | 需认证 |
| POST | `/auth/logout` | 登出 | 需认证 |
| GET | `/auth/profile` | 获取当前用户 | 需认证 |
| PUT | `/auth/profile` | 更新个人信息 | 需认证 |
| PUT | `/auth/password` | 修改密码 | 需认证 |

### 3.2 图书模块 (Books)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/books` | 图书列表 (分页/筛选/搜索) | 公开 |
| GET | `/books/:id` | 图书详情 | 公开 |
| GET | `/books/categories` | 分类列表 | 公开 |
| GET | `/books/:id/availability` | 可借数量 | 公开 |
| POST | `/books` | 添加图书 | ADMIN |
| PUT | `/books/:id` | 更新图书 | ADMIN |
| DELETE | `/books/:id` | 删除图书 | ADMIN |
| PUT | `/books/:id/stock` | 更新库存 | ADMIN |

### 3.3 借阅模块 (Borrowings)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/borrowings` | 我的借阅记录 | 需认证 |
| GET | `/borrowings/:id` | 借阅详情 | 需认证 |
| POST | `/borrowings` | 借阅图书 | 需认证 |
| POST | `/borrowings/:id/return` | 归还图书 | 需认证 |
| POST | `/borrowings/:id/renew` | 续借图书 | 需认证 |
| GET | `/admin/borrowings` | 所有借阅记录 | ADMIN |
| POST | `/admin/borrowings/manual` | 手动借出 | ADMIN |
| POST | `/admin/borrowings/:id/force-return` | 强制归还 | ADMIN |

### 3.4 预约模块 (Reservations)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/reservations` | 我的预约 | 需认证 |
| POST | `/reservations` | 预约图书 | 需认证 |
| DELETE | `/reservations/:id` | 取消预约 | 需认证 |
| GET | `/admin/reservations` | 所有预约 | ADMIN |
| PUT | `/admin/reservations/:id/status` | 更新预约状态 | ADMIN |

### 3.5 罚款模块 (Fines)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/fines` | 我的罚款 | 需认证 |
| POST | `/fines/:id/pay` | 缴纳罚款 | 需认证 |
| GET | `/admin/fines` | 所有罚款 | ADMIN |
| PUT | `/admin/fines/:id` | 编辑罚款 | ADMIN |
| DELETE | `/admin/fines/:id` | 删除罚款 | ADMIN |

### 3.6 用户模块 (Users) - ADMIN ONLY

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/users` | 用户列表 |
| GET | `/users/:id` | 用户详情 |
| POST | `/users` | 创建用户 |
| PUT | `/users/:id` | 更新用户 |
| DELETE | `/users/:id` | 删除用户 |
| GET | `/users/:id/borrowings` | 用户的借阅记录 |

### 3.7 统计模块 (Statistics) - ADMIN ONLY

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/stats/dashboard` | 仪表盘数据 |
| GET | `/stats/borrowings` | 借阅统计 |
| GET | `/stats/books` | 图书统计 |
| GET | `/stats/users` | 用户统计 |
| GET | `/stats/fines` | 罚款统计 |

### 3.8 响应格式

```typescript
// 成功响应
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// 错误响应
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## 4. 前端设计

### 4.1 页面结构

```
PUBLIC
├── /login                    # 登录页
├── /register                 # 注册页
└── /404                      # 404 页

STUDENT / TEACHER
├── /                         # 仪表盘
├── /books                    # 图书列表
│   └── /books/:id           # 图书详情
├── /borrowings               # 我的借阅
├── /reservations             # 我的预约
├── /fines                    # 我的罚款
└── /profile                  # 个人信息

ADMIN
├── /admin                    # 管理仪表盘
├── /admin/books              # 图书管理
│   └── /admin/books/:id/edit
│   └── /admin/books/new
├── /admin/users              # 用户管理
├── /admin/borrowings         # 借阅管理
├── /admin/reservations       # 预约管理
├── /admin/fines              # 罚款管理
└── /admin/stats              # 统计报表
```

### 4.2 组件库
- **Tailwind CSS**: 样式框架
- **Radix UI**: 无样式可访问性组件
- **React Query**: 数据获取和缓存
- **React Hook Form**: 表单处理
- **Zod**: Schema 验证
- **React Router**: 路由管理

## 5. 实现计划

### 阶段 1: 基础架构
1. 初始化 NestJS 后端项目
2. 初始化 React 前端项目
3. 配置 Prisma 和 PostgreSQL 连接
4. 实现 JWT 认证系统
5. 搭建基础 UI 组件库

### 阶段 2: 图书核心
1. 图书 CRUD API
2. 图书搜索和筛选
3. 分类管理
4. 图书列表页面
5. 图书详情页面

### 阶段 3: 借阅流程
1. 借阅 API
2. 归还 API
3. 续借 API
4. 库存扣减逻辑
5. 借阅记录页面

### 阶段 4: 用户系统
1. 用户注册/登录
2. 个人中心
3. RBAC 权限控制
4. 角色页面隔离

### 阶段 5: 预约功能
1. 预约 API
2. 预约状态流转
3. 取书确认
4. 预约列表页面

### 阶段 6: 管理后台
1. 图书管理完整 CRUD
2. 用户管理完整 CRUD
3. 借阅管理面板
4. 预约管理面板
5. 罚款管理

### 阶段 7: 统计报表
1. 仪表盘数据
2. 借阅统计
3. 热门图书排行
4. 导出功能

### 阶段 8: 优化和测试
1. 单元测试
2. E2E 测试
3. 性能优化
4. 代码规范

## 6. 约束和假设

### 6.1 不包含
- 邮件通知功能 (MVP 阶段)
- 微信/短信通知
- 图书条码扫描
- 智能推荐系统
- 多图书馆支持

### 6.2 假设
- 用户通过邮箱登录
- 图书 ISBN 作为唯一标识
- 罚款金额按天计算
- 最大续借次数为 2 次

## 7. 验收标准

### 功能验收
- [ ] 学生可以搜索和借阅图书
- [ ] 教师可以搜索和借阅图书（更高限额）
- [ ] 管理员可以完全管理图书和用户
- [ ] 借阅、归还、续借流程正常
- [ ] 预约功能完整
- [ ] 统计数据准确

### 非功能验收
- [ ] API 响应时间 < 500ms
- [ ] 前端首屏加载 < 3s
- [ ] 80% 以上代码测试覆盖
- [ ] 响应式设计支持移动端
- [ ] 符合 WCAG 可访问性标准
