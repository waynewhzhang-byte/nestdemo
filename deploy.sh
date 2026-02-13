#!/bin/bash

# ===========================================
# 图书馆管理系统 - 部署脚本
# ===========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    log_error "请使用 root 权限运行此脚本"
    exit 1
fi

# 部署类型
DEPLOY_METHOD=${1:-docker}

log_info "开始部署图书馆管理系统..."
log_info "部署方式: $DEPLOY_METHOD"

case $DEPLOY_METHOD in
    docker)
        log_info "使用 Docker Compose 部署"
        docker-compose -f docker-compose.production.yml up -d --build
        ;;
    manual)
        log_info "使用手动部署"
        bash deployment/deploy-manual.sh
        ;;
    *)
        log_error "不支持的部署方式: $DEPLOY_METHOD"
        echo "使用方法: $0 [docker|manual]"
        exit 1
        ;;
esac

log_info "部署完成!"
log_info "访问地址: https://library.yourschool.edu"
