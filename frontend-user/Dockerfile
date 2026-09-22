# syntax=docker/dockerfile:1

# ============================================================
# 构建参数：构建阶段与运行阶段共用同一份定义。
# 默认值与根目录 .env 保持一致，docker compose 会从 .env 传入，
# 也可手动覆盖：docker build --build-arg APP_PORT=9000 .
# ============================================================
ARG NODE_VERSION=20-alpine
ARG NGINX_VERSION=1.27-alpine
ARG APP_PORT=8081

# ---------- 构建阶段：安装依赖并编译产物 ----------
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS builder

WORKDIR /app

# 只拷贝依赖清单：package-lock.json 不变时复用镜像层缓存，跳过重装依赖
COPY package.json package-lock.json ./

# npm 下载缓存挂载到 BuildKit 缓存目录，重复构建不再重复下载依赖包
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# 拷贝源代码并编译（.dockerignore 已排除本机 node_modules / dist）
COPY . .
RUN npm run build

# ---------- 运行阶段：只保留运行需要的静态文件 ----------
FROM --platform=$TARGETPLATFORM nginx:${NGINX_VERSION}

ARG APP_PORT
# 供 nginx 配置模板渲染（envsubst）使用
ENV PORT=${APP_PORT}

# nginx 官方镜像启动时会用环境变量渲染 /etc/nginx/templates 下的模板
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 仅从构建阶段拷贝编译出的静态文件，源码与依赖不进运行镜像
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE ${APP_PORT}

CMD ["nginx", "-g", "daemon off;"]
