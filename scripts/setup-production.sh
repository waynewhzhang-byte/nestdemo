#!/bin/bash
# 生产环境部署前执行：迁移 + 种子
# 使用前确保：
#   1) PostgreSQL 已启动
#   2) backend/.env 已配置 DATABASE_URL、JWT_SECRET（强随机值）
#   3) 生成 JWT_SECRET: openssl rand -base64 32

set -e
cd "$(dirname "$0")/../backend"

echo "📦 Running database migration..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npm run prisma:seed

echo "✅ Database setup complete."
echo ""
echo "📝 首次部署后请修改种子账号密码（admin/student/teacher）或删除演示账号。"
