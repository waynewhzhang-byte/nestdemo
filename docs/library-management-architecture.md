# 图书馆管理系统 - 项目架构文档

## 文档信息

| 项目 | 内容 |
|------|------|
| **项目名称** | School Library Management System |
| **项目类型** | 全栈 Web 应用 (NestJS + React) |
| **版本** | 1.0.0 |
| **创建日期** | 2026-02-13 |
| **技术栈** | NestJS, React, TypeScript, PostgreSQL, Prisma, Tailwind CSS |

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [项目目录结构](#3-项目目录结构)
4. [后端架构设计 (DDD)](#4-后端架构设计-ddd)
5. [前端架构设计](#5-前端架构设计)
6. [核心功能模块](#6-核心功能模块)
7. [用户故事](#7-用户故事)
8. [业务规则](#8-业务规则)
9. [API 接口概览](#9-api-接口概览)
10. [数据库设计](#10-数据库设计)
11. [安全与认证](#11-安全与认证)
12. [部署配置](#12-部署配置)
13. [测试](#13-测试)
14. [环境配置](#14-环境配置)

---

## 1. 项目概述

### 1.1 项目背景

图书馆管理系统是一个用于管理学校图书馆日常运营的全栈 Web 应用。该系统实现了图书管理、借阅管理、预约管理、罚款管理以及用户权限管理等核心功能。

### 1.2 系统角色

系统支持三种用户角色：

| 角色 | 说明 | 权限 |
|------|------|------|
| **学生 (STUDENT)** | 普通用户 | 借书、还书、续借、预约、查看个人记录 |
| **教师 (TEACHER)** | 教职用户 | 借书、还书、续借、预约、图书管理、查看统计 |
| **管理员 (ADMIN)** | 系统管理员 | 全部权限，包括用户管理、系统配置 |

### 1.3 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端 (Frontend)                        │
│  React 19 + TypeScript + Vite + Tailwind CSS + React Query     │
│                    http://localhost:5173                        │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         服务端 (Backend)                          │
│  NestJS + TypeScript + Prisma ORM + PostgreSQL                 │
│                    http://localhost:3000                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         数据库 (Database)                       │
│                    PostgreSQL (localhost:5432)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 技术架构

### 2.1 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **NestJS** | ^10.0.0 | Node.js 企业级后端框架 |
| **TypeScript** | ^5.1.3 | 类型安全 |
| **Prisma** | ^5.7.0 | ORM (对象关系映射) |
| **PostgreSQL** | - | 关系型数据库 |
| **JWT** | ^10.2.0 | 身份认证 |
| **Passport** | ^0.7.0 | 认证策略 |
| **bcrypt** | ^5.1.1 | 密码加密 |
| **Swagger** | ^7.1.16 | API 文档 |
| **Helmet** | ^8.1.0 | 安全 HTTP 头 |
| **Throttler** | ^6.5.0 | 请求限流 |
| **Schedule** | ^6.1.1 | 定时任务 |

### 2.2 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | ^19.2.0 | UI 框架 |
| **TypeScript** | ~5.9.3 | 类型安全 |
| **Vite** | ^7.2.4 | 构建工具 |
| **Tailwind CSS** | ^4.1.18 | 样式框架 |
| **React Router** | ^7.12.0 | 路由管理 |
| **React Query** | ^5.90.19 | 服务端状态管理 |
| **React Hook Form** | ^7.71.1 | 表单处理 |
| **Zod** | ^4.3.5 | 表单验证 |
| **Axios** | ^1.13.2 | HTTP 客户端 |
| **Radix UI** | - | UI 组件库 |

---

## 3. 项目目录结构

### 3.1 整体结构

```
library-management/
├── backend/                    # NestJS 后端
│   ├── src/
│   │   ├── auth/              # 认证模块
│   │   ├── books/             # 图书模块
│   │   ├── borrowings/        # 借阅模块
│   │   ├── reservations/      # 预约模块
│   │   ├── fines/             # 罚款模块
│   │   ├── users/             # 用户模块
│   │   ├── statistics/        # 统计模块
│   │   ├── health/            # 健康检查模块
│   │   ├── domain/            # 领域层 (DDD)
│   │   │   ├── entities/      # 实体
│   │   │   ├── repositories/  # 仓储接口
│   │   │   └── services/      # 领域服务
│   │   ├── infrastructure/    # 基础设施层
│   │   │   └── repositories/  # Prisma 仓储实现
│   │   ├── application/       # 应用层
│   │   ├── common/            # 公共模块
│   │   ├── constants/         # 常量定义
│   │   └── prisma/            # Prisma 模块
│   ├── prisma/
│   │   ├── schema.prisma      # 数据库模型
│   │   ├── migrations/        # 迁移文件
│   │   └── seed.ts            # 种子数据
│   ├── test/                  # 测试配置
│   └── package.json
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # 认证组件
│   │   │   ├── common/        # 通用组件
│   │   │   ├── layout/        # 布局组件
│   │   │   └── ui/            # UI 组件库
│   │   ├── pages/             # 页面组件
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── services/          # API 服务
│   │   ├── types/             # 类型定义
│   │   ├── lib/               # 工具库
│   │   └── assets/            # 静态资源
│   ├── public/                # 公共资源
│   └── package.json
│
├── docs/                       # 文档
│   └── plans/                 # 设计文档
│
├── deployment/                # 部署配置
│   ├── deploy-manual.sh
│   └── library-backend.service
│
└── scripts/                   # 脚本文件
```

### 3.2 后端模块结构

每个业务模块遵循以下结构（以 books 为例）：

```
books/
├── books.module.ts           # NestJS 模块定义
├── books.controller.ts       # 控制器 (API 入口)
├── books.service.ts          # 应用服务 (业务逻辑)
├── dto/                      # 数据传输对象
│   └── books.dto.ts
```

### 3.3 前端目录结构

```
src/
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx    # 路由保护
│   ├── common/
│   │   └── ErrorBoundary.tsx     # 错误边界
│   ├── layout/
│   │   ├── Shell.tsx             # 页面壳
│   │   └── Sidebar.tsx           # 侧边栏
│   └── ui/                       # UI 组件库
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── table.tsx
│       └── ...
├── pages/
│   ├── Login.tsx                 # 登录页
│   ├── Register.tsx              # 注册页
│   ├── Dashboard.tsx             # 仪表盘
│   ├── Books.tsx                 # 图书管理
│   ├── Borrowings.tsx            # 借阅管理
│   ├── Reservations.tsx          # 预约管理
│   ├── Users.tsx                 # 用户管理
│   ├── Statistics.tsx            # 统计报表
│   └── Profile.tsx               # 个人中心
├── hooks/
│   └── useAuth.tsx               # 认证 Hook
├── services/
│   └── api.ts                    # API 客户端
├── types/                        # TypeScript 类型
└── lib/
    └── utils.ts                  # 工具函数
```

---

## 4. 后端架构设计 (DDD)

### 4.1 DDD 分层架构

项目采用领域驱动设计 (Domain-Driven Design) 的分层架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      表示层 (Presentation)                    │
│              Controllers (books.controller.ts)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      应用层 (Application)                   │
│               Services (books.service.ts)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        领域层 (Domain)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Entities   │  │   Domain    │  │ Repository          │  │
│  │ (Book,      │  │   Services  │  │ Interfaces          │  │
│  │  User,      │  │ (BookDomain │  │ (IBookRepository)   │  │
│  │  Borrowing) │  │  Service)   │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   基础设施层 (Infrastructure)               │
│              Prisma Repositories (实现)                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 领域实体 (Entities)

#### 4.2.1 User 实体

```typescript
// backend/src/domain/entities/user.entity.ts
export interface UserProps {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  studentId?: string;
  teacherId?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  // Getters
  get id(): string
  get email(): string
  get name(): string
  get role(): Role
  get studentId(): string | undefined
  get teacherId(): string | undefined
  get isActive(): boolean

  // 业务方法
  isStudent(): boolean
  isTeacher(): boolean
  isAdmin(): boolean
  canBorrow(): boolean
  activate(): void
  deactivate(): void
  update(updates: { name?: string; phone?: string }): void
}
```

#### 4.2.2 Book 实体

```typescript
// backend/src/domain/entities/book.entity.ts
export interface BookProps {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  category: string;
  description?: string;
  coverImage?: string;
  location?: string;
  totalCopies: number;
  availableCopies: number;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Book {
  // Getters
  get id(): string
  get isbn(): string
  get title(): string
  get author(): string
  get availableCopies(): number

  // 业务方法
  isAvailable(): boolean
  canBeBorrowed(): boolean
  borrow(): void
  return(): void
  update(updates: Partial<BookProps>): void
}
```

#### 4.2.3 Borrowing 实体

```typescript
// backend/src/domain/entities/borrowing.entity.ts
export interface BorrowingProps {
  id: string;
  userId: string;
  bookId: string;
  borrowedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  status: BorrowingStatus;
  renewedCount: number;
  maxRenewals: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Borrowing {
  // 业务方法
  isActive(): boolean
  isOverdue(): boolean
  isReturned(): boolean
  canRenew(userRole: Role): boolean
  renew(newDueDate: Date): void
  return(): void
  markOverdue(): void
  getDaysOverdue(): number
}
```

### 4.3 仓储接口 (Repository Interfaces)

```typescript
// backend/src/domain/repositories/book.repository.interface.ts
export interface IBookRepository {
  findById(id: string): Promise<Book | null>;
  findByISBN(isbn: string): Promise<Book | null>;
  findAll(options?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ books: Book[]; total: number }>;
  save(book: Book): Promise<Book>;
  update(book: Book): Promise<Book>;
  delete(id: string): Promise<void>;
  decrementAvailableCopies(id: string): Promise<boolean>;
  incrementAvailableCopies(id: string): Promise<void>;
  adjustInventory(id: string, adjustment: number): Promise<Book>;
}
```

### 4.4 领域服务 (Domain Services)

```typescript
// backend/src/domain/services/book.domain-service.ts
@Injectable()
export class BookDomainService {
  constructor(private readonly bookRepo: PrismaBookRepository) {}

  async createBook(params: CreateBookParams): Promise<{ book: Book; message: string }>
  async updateBook(params: UpdateBookParams): Promise<{ book: Book; message: string }>
  async adjustInventory(params: AdjustInventoryParams): Promise<{ book: Book; message: string }>
  async canDelete(id: string): Promise<{ canDelete: boolean; reason?: string }>
}
```

### 4.5 基础设施层 (Infrastructure)

基础设施层包含 Prisma 仓储的具体实现：

```
backend/src/infrastructure/repositories/
├── prisma-book.repository.ts        # Book 仓储实现
├── prisma-borrowing.repository.ts   # Borrowing 仓储实现
├── prisma-user.repository.ts        # User 仓储实现
├── prisma-fine.repository.ts        # Fine 仓储实现
└── prisma-reservation.repository.ts # Reservation 仓储实现
```

---

## 5. 前端架构设计

### 5.1 页面结构

系统包含以下页面（全部已翻译为简体中文）：

| 页面 | 路径 | 角色 | 说明 |
|------|------|------|------|
| 登录 | `/login` | 全部 | 用户登录 |
| 注册 | `/register` | 全部 | 用户注册 |
| 仪表盘 | `/dashboard` | 全部 | 概览统计 |
| 图书管理 | `/books` | 全部 | 图书查询与管理 |
| 借阅管理 | `/borrowings` | 全部 | 借阅记录与操作 |
| 预约管理 | `/reservations` | 全部 | 预约查询与操作 |
| 用户管理 | `/users` | ADMIN | 用户管理 |
| 统计报表 | `/statistics` | ADMIN/TEACHER | 数据统计 |
| 个人中心 | `/profile` | 全部 | 个人信息 |

### 5.2 路由保护

```typescript
// frontend/src/components/auth/ProtectedRoute.tsx
- 未登录用户重定向到 /login
- 角色权限验证
- 路由级别访问控制
```

### 5.3 状态管理

| 状态类型 | 管理方式 |
|----------|----------|
| 用户认证 | React Context (`useAuth` hook) |
| 服务端数据 | React Query (`@tanstack/react-query`) |
| 表单数据 | React Hook Form + Zod 验证 |
| UI 状态 | React local state |

### 5.4 API 客户端

```typescript
// frontend/src/services/api.ts
- Axios 实例配置
- JWT Token 自动注入
- 401 响应自动刷新 Token
- 错误处理拦截器
```

---

## 6. 核心功能模块

### 6.1 用户管理 (Users)

**功能列表：**
- 用户注册（学生/教师）
- 用户登录（JWT 认证）
- 用户信息查看与编辑
- 用户启用/禁用（管理员）
- 用户角色分配

### 6.2 图书管理 (Books)

**功能列表：**
- 图书新增（ISBN 唯一性校验）
- 图书信息编辑
- 图书删除
- 图书查询（分页、关键词、分类）
- 库存调整
- 图书统计

**图书状态：**
| 状态 | 说明 |
|------|------|
| AVAILABLE | 可借 |
| BORROWED | 已借出 |
| RESERVED | 已预约 |
| MAINTENANCE | 维护中 |
| LOST | 遗失 |

### 6.3 借阅管理 (Borrowings)

**功能列表：**
- 借书（库存检查、借阅限制检查）
- 还书
- 续借（最多 2 次）
- 借阅记录查询
- 逾期提醒

**借阅状态：**
| 状态 | 说明 |
|------|------|
| ACTIVE | 借阅中 |
| RETURNED | 已归还 |
| OVERDUE | 已逾期 |
| LOST | 遗失 |

### 6.4 预约管理 (Reservations)

**功能列表：**
- 图书预约
- 预约取消
- 预约查询
- 预约自动过期（3 天）

**预约状态：**
| 状态 | 说明 |
|------|------|
| PENDING | 待处理 |
| READY | 可取 |
| CANCELLED | 已取消 |
| FULFILLED | 已履约 |
| EXPIRED | 已过期 |

### 6.5 罚款管理 (Fines)

**功能列表：**
- 逾期罚款自动生成
- 罚款查看
- 罚款缴纳
- 罚款记录

**罚款状态：**
| 状态 | 说明 |
|------|------|
| UNPAID | 未缴纳 |
| PARTIAL | 部分缴纳 |
| PAID | 已缴清 |

### 6.6 统计报表 (Statistics)

**功能列表：**
- 图书借阅统计
- 用户借阅排行
- 分类统计
- 逾期统计

---

## 7. 用户故事

### 7.1 学生用户

| 编号 | 用户故事 | 优先级 |
|------|----------|--------|
| US-001 | 作为学生，我可以注册账号并登录系统 | 高 |
| US-002 | 作为学生，我可以搜索和查看图书馆的图书 | 高 |
| US-003 | 作为学生，我可以借阅图书（最多 5 本） | 高 |
| US-004 | 作为学生，我可以归还借阅的图书 | 高 |
| US-005 | 作为学生，我可以续借图书（最多 2 次） | 高 |
| US-006 | 作为学生，我可以预约已借出的图书 | 中 |
| US-007 | 作为学生，我可以查看我的借阅历史 | 中 |
| US-008 | 作为学生，我可以查看和缴纳逾期罚款 | 中 |
| US-009 | 作为学生，我可以修改个人信息 | 低 |

### 7.2 教师用户

| 编号 | 用户故事 | 优先级 |
|------|----------|--------|
| UT-001 | 作为教师，我可以借阅更多图书（最多 10 本） | 高 |
| UT-002 | 作为教师，我可以借阅更长时间（90 天） | 高 |
| UT-003 | 作为教师，我可以添加和管理图书 | 中 |
| UT-004 | 作为教师，我可以查看图书馆统计报表 | 中 |

### 7.3 管理员用户

| 编号 | 用户故事 | 优先级 |
|------|----------|--------|
| UA-001 | 作为管理员，我可以管理所有用户账号 | 高 |
| UA-002 | 作为管理员，我可以分配用户角色 | 高 |
| UA-003 | 作为管理员，我可以启用/禁用用户 | 高 |
| UA-004 | 作为管理员，我可以删除图书 | 中 |
| UA-005 | 作为管理员，我可以调整图书库存 | 高 |
| UA-006 | 作为管理员，我可以查看完整统计报表 | 高 |

---

## 8. 业务规则

### 8.1 借阅限制

| 用户角色 | 最大借阅数量 | 借阅天数 | 最大续借次数 |
|----------|--------------|----------|--------------|
| 学生 | 5 本 | 30 天 | 2 次 |
| 教师 | 10 本 | 90 天 | 2 次 |

### 8.2 罚款规则

| 规则 | 值 |
|------|-----|
| 逾期罚款 | 0.50 元/天 |
| 预约过期 | 3 天后自动失效 |

### 8.3 预约规则

- 预约后 3 天内未取书自动过期
- 预约可取消
- 图书归还后，预约队列自动通知

---

## 9. API 接口概览

### 9.1 认证模块 (Auth)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /auth/register | 用户注册 | 否 |
| POST | /auth/login | 用户登录 | 否 |
| POST | /auth/refresh | 刷新 Token | 是 |
| GET | /auth/profile | 获取当前用户 | 是 |

### 9.2 图书模块 (Books)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /books | 获取图书列表 | 否 |
| GET | /books/:id | 获取图书详情 | 否 |
| POST | /books | 创建图书 | 是 |
| PUT | /books/:id | 更新图书 | 是 |
| DELETE | /books/:id | 删除图书 | 是 |
| GET | /books/categories | 获取分类列表 | 否 |
| GET | /books/statistics | 获取统计 | 是 |

### 9.3 借阅模块 (Borrowings)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /borrowings | 获取借阅列表 | 是 |
| POST | /borrowings | 借书 | 是 |
| POST | /borrowings/:id/return | 还书 | 是 |
| POST | /borrowings/:id/renew | 续借 | 是 |

### 9.4 预约模块 (Reservations)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /reservations | 获取预约列表 | 是 |
| POST | /reservations | 创建预约 | 是 |
| DELETE | /reservations/:id | 取消预约 | 是 |

### 9.5 用户模块 (Users)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /users | 获取用户列表 | 是 |
| GET | /users/:id | 获取用户详情 | 是 |
| PUT | /users/:id | 更新用户 | 是 |
| DELETE | /users/:id | 删除用户 | 是 |

### 9.6 统计模块 (Statistics)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /statistics/overview | 概览统计 | 是 |
| GET | /statistics/borrowings | 借阅统计 | 是 |
| GET | /statistics/books | 图书统计 | 是 |
| GET | /statistics/users | 用户统计 | 是 |

---

## 10. 数据库设计

### 10.1 数据模型

#### User 表
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(STUDENT)
  studentId String?  @unique  // 学号
  teacherId String?  @unique  // 工号
  phone     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  borrowings   Borrowing[]
  reservations Reservation[]
  fines        Fine[]
}
```

#### Book 表
```prisma
model Book {
  id              String     @id @default(uuid())
  isbn            String     @unique
  title           String
  author          String
  publisher       String
  publishedYear   Int
  category        String
  description     String?
  coverImage      String?
  location        String?
  totalCopies     Int        @default(1)
  availableCopies Int        @default(1)
  status          BookStatus @default(AVAILABLE)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  borrowings   Borrowing[]
  reservations Reservation[]
}
```

#### Borrowing 表
```prisma
model Borrowing {
  id           String          @id @default(uuid())
  userId       String
  bookId       String
  borrowedAt   DateTime        @default(now())
  dueDate      DateTime
  returnedAt   DateTime?
  status       BorrowingStatus @default(ACTIVE)
  renewedCount Int             @default(0)
  maxRenewals  Int             @default(2)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  user   User   @relation(fields: [userId], references: [id])
  book   Book   @relation(fields: [bookId], references: [id])
  fine   Fine?
}
```

#### Reservation 表
```prisma
model Reservation {
  id          String            @id @default(uuid())
  userId      String
  bookId      String
  status      ReservationStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  expiresAt   DateTime
  notifiedAt  DateTime?
  fulfilledAt DateTime?

  user User @relation(fields: [userId], references: [id])
  book Book @relation(fields: [bookId], references: [id])
}
```

#### Fine 表
```prisma
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

  borrowing Borrowing @relation(fields: [borrowingId], references: [id])
  user      User      @relation(fields: [userId], references: [id])
}
```

### 10.2 实体关系图

```
┌─────────┐       ┌─────────────┐       ┌─────────┐
│  User   │──────▶│  Borrowing  │◀──────│  Book   │
└─────────┘       └─────────────┘       └─────────┘
      │                 │                    │
      │                 │                    │
      ▼                 ▼                    ▼
┌─────────┐       ┌───────────┐       ┌─────────────┐
│  Fine   │       │Reservation│       │Reservation │
└─────────┘       └───────────┘       └─────────────┘
```

---

## 11. 安全与认证

### 11.1 认证方案

- **JWT (JSON Web Token)**：无状态令牌认证
- **Access Token**：15 分钟有效期
- **Refresh Token**：7 天有效期
- **Token 刷新**：自动轮换

### 11.2 密码安全

- **bcrypt** 加密存储
- 密码强度验证

### 11.3 API 安全

- **Helmet**：安全 HTTP 头
- **Throttler**：请求限流（100 req/min）
- **CORS**：跨域资源共享
- **输入验证**：class-validator + DTO

### 11.4 权限控制

- **@Roles()**：角色装饰器
- **RolesGuard**：角色守卫
- **JwtAuthGuard**：JWT 认证守卫

---

## 12. 部署配置

### 12.1 开发环境

| 服务 | 地址 | 端口 |
|------|------|------|
| 后端 | http://localhost | 3000 |
| 前端 | http://localhost | 5173 |
| 数据库 | localhost | 5432 |

### 12.2 生产环境

- **Docker**：容器化部署
- **Nginx**：反向代理
- **PostgreSQL**：生产数据库

### 12.3 环境变量

#### 后端 (.env)
```env
DATABASE_URL=postgresql://user:password@host:5432/library
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
FRONTEND_URL=https://your-frontend.com
```

#### 前端 (.env)
```env
VITE_API_URL=http://localhost:3000/api/v1
```

---

## 13. 测试

### 13.1 单元测试

- **框架**：Jest
- **运行**：`npm test`
- **覆盖率**：`npm run test:cov`

### 13.2 E2E 测试

- **框架**：Jest + Supertest
- **配置**：`test/jest-e2e.json`
- **运行**：`npm run test:e2e`

### 13.3 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@library.edu | admin123 |
| 教师 | teacher@library.edu | teacher123 |
| 学生 | student@library.edu | student123 |

---

## 14. 环境配置

### 14.1 本地开发环境

```bash
# 后端
cd backend
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev

# 前端
cd frontend
npm install
npm run dev
```

### 14.2 数据库配置

| 项目 | 值 |
|------|-----|
| 数据库类型 | PostgreSQL |
| 主机 | localhost |
| 端口 | 5432 |
| 用户名 | postgres |
| 密码 | zww0625wh |
| 数据库名 | library |

---

## 附录

### A. 常用命令

```bash
# 后端
npm run start:dev          # 启动开发服务器
npm run build              # 构建生产版本
npm run lint               # 代码检查
npm run format             # 代码格式化
npm run test               # 运行测试
npm run prisma:migrate     # 数据库迁移
npm run prisma:seed        # 种子数据

# 前端
npm run dev                # 启动开发服务器
npm run build              # 构建生产版本
npm run lint               # 代码检查
```

### B. API 文档

启动服务后访问：http://localhost:3000/docs

### C. 相关文档

- [NestJS 文档](https://docs.nestjs.com)
- [Prisma 文档](https://www.prisma.io/docs)
- [React 文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

---

**文档版本**: 1.0.0  
**最后更新**: 2026-02-13  
**维护者**: 开发团队
