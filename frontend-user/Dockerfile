# 语法参考：https://docs.docker.com/reference/dockerfile/
# PORT / NODE_VERSION 由 docker-compose.yml 从根目录 .env 传入；
# ARG 中的默认值保证 `docker build` 单独执行时也可用。
# 单独构建示例：
#   docker build --build-arg NODE_VERSION=20 --build-arg PORT=8081 -t frontend-user ./frontend-user

############################
# 构建阶段：安装依赖 + 编译产物
############################
ARG NODE_VERSION=20
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS builder

# 必须在 FROM 之后再次声明，ARG 才在构建阶段内可用
ARG NODE_VERSION
ARG PORT=8081

WORKDIR /app

# 先复制依赖清单，单独成层：只要 package.json / package-lock.json 未变，
# 即使源码修改也会复用已缓存的依赖层，避免每次构建都重新 npm ci
COPY package*.json ./

# npm ci 严格按 package-lock.json 安装，保证构建可复现。
# BuildKit 缓存挂载（--mount=type=cache）把 npm 下载缓存保留在构建器中，
# 依赖层失效时也无需重复下载。
# 不使用 BuildKit（旧版 docker build）时该挂载会被忽略，回退为普通安装。
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# 依赖安装成功后再复制源码并编译；构建失败时会停在此步，
# 已缓存的依赖层和 npm 下载缓存不受影响，修复后重跑只需重新编译
COPY . .
RUN npm run build

############################
# 运行阶段：只保留运行需要的静态文件
############################
FROM --platform=$TARGETPLATFORM nginx:alpine AS runtime

ARG PORT=8081

# 运行期需要端口（nginx 模板替换、EXPOSE、容器内进程读取），用 ENV 固化
ENV PORT=${PORT}

# 以模板形式提供 nginx 配置：官方 nginx 镜像启动时会用 envsubst
# 把 /etc/nginx/templates/*.template 中的 ${PORT} 替换为环境变量值，
# 输出到 /etc/nginx/conf.d/，从而与本地开发共用同一端口配置
COPY nginx.conf /etc/nginx/templates/default.conf.template

# 仅复制构建产物（静态文件），不携带 node_modules 和源码
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE ${PORT}

CMD ["nginx", "-g", "daemon off;"]
