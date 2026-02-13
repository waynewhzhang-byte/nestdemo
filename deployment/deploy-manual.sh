#!/bin/bash

# ===========================================
# 图书馆管理系统 - 手动部署脚本
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 部署目录
DEPLOY_DIR="/var/www/library"
BACKEND_DIR="$DEPLOY_DIR/backend"
FRONTEND_DIR="$DEPLOY_DIR/frontend"

log_info "开始手动部署..."

# 1. 安装依赖并构建后端
log_info "构建后端..."
cd "$BACKEND_DIR"
npm ci --only=production
npm run build

# 2. 安装依赖并构建前端
log_info "构建前端..."
cd "$FRONTEND_DIR"
npm ci
npm run build

# 3. 配置环境变量
log_info "配置环境变量..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
    log_warn "请编辑 $BACKEND_DIR/.env 配置数据库和 JWT 密钥"
fi

# 4. 运行数据库迁移
log_info "运行数据库迁移..."
cd "$BACKEND_DIR"
npx prisma migrate deploy

# 5. 配置 systemd 服务
log_info "配置 systemd 服务..."
cp deployment/library-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable library-backend
systemctl restart library-backend

# 6. 配置 Nginx
log_info "配置 Nginx..."
cp nginx.conf /etc/nginx/sites-available/library
ln -sf /etc/nginx/sites-available/library /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

log_info "部署完成!"
log_info "后端服务: systemctl status library-backend"
log_info "前端目录: $FRONTEND_DIR/dist"
