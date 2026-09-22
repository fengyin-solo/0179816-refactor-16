## How to Run

1. 确保已安装 Docker 和 Docker Compose

2. 在项目根目录执行：
```bash
docker compose up --build -d
```

3. 访问应用：
- 用户端: http://localhost:8081（端口以根目录 `.env` 中的 `PORT` 为准）

4. 停止服务：
```bash
docker compose down
```

## Services

| 服务名称 | 端口 | 描述 |
|---------|------|------|
| frontend-user | 8081（`.env` 的 `PORT`） | 古琴音频分析软件用户端 |

## 配置参数（单一来源）

所有运行参数统一定义在根目录的 **`.env`**（已提交入库），本地开发与容器启动共用同一份：

| 参数 | 默认值 | 作用范围 |
|------|--------|----------|
| `PORT` | 8081 | 本地 `npm run dev` / `npm run preview` 端口、容器内 nginx 监听端口、宿主机端口映射、健康检查 |
| `NODE_VERSION` | 20-alpine | 构建阶段的 Node 基镜像版本 |
| `NGINX_VERSION` | 1.27-alpine | 运行阶段的 Nginx 基镜像版本 |

取值链路：

- **本地开发**：`vite.config.js` 通过 `loadEnv` 读取根目录 `.env`
- **容器启动**：`docker compose` 自动加载 `.env`，以 build-arg 传入 Dockerfile，并以环境变量 `PORT` 注入容器供 nginx 配置模板渲染

临时覆盖（不改文件）：

```bash
PORT=9000 npm run dev              # 本地开发
PORT=9000 docker compose up -d     # 容器启动（shell 环境变量优先于 .env）
```

## 依赖缓存

构建通过两层缓存加速，日常改代码不会重装依赖：

1. **镜像层缓存**：Dockerfile 先单独拷贝 `package.json` 和 `package-lock.json` 再执行 `npm ci`。只要 lock 文件没变，依赖安装层直接命中缓存。
2. **npm 下载缓存**：`npm ci` 通过 BuildKit 缓存挂载（`--mount=type=cache,target=/root/.npm`）复用下载好的依赖包，即使 lock 文件变了也只下载新增部分。需要 Docker 18.09+ 并启用 BuildKit（新版本默认开启；如未开启可设 `DOCKER_BUILDKIT=1`）。

注意：`.dockerignore` 已排除本机 `node_modules` 和 `dist`，镜像内总是重新安装、重新构建，不会把本机平台相关的二进制带进镜像。

## 构建失败排查

| 现象 | 原因与处理 |
|------|-----------|
| `npm ci` 报 `package.json and package-lock.json are not in sync` | 依赖清单与 lock 文件不同步。本地执行 `npm install` 更新 `package-lock.json` 并提交 |
| 报 `esbuild` / `rollup` 平台二进制相关错误 | 本机 `node_modules` 被拷进了镜像。确认 `frontend-user/.dockerignore` 存在且包含 `node_modules` |
| `docker compose build` 报多平台相关错误 | compose 构建只支持本机平台。多平台镜像请用 buildx：`docker buildx build --platform linux/amd64,linux/arm64 -t <镜像名> --push ./frontend-user` |
| 构建结果像是用了旧代码/旧依赖 | 缓存命中了过期层。执行 `docker compose build --no-cache` 全量重建 |
| 想看详细构建日志 | `docker compose build --progress=plain` |
| 启动后端口冲突 | 修改根目录 `.env` 的 `PORT` 后重新 `docker compose up -d`，本地与容器端口会一起切换 |
| 容器健康检查失败 | `docker compose logs frontend-user` 查看 nginx 日志；确认 `.env` 的 `PORT` 未被占用 |

## 测试

### 测试音频

项目提供了测试音频文件 `frontend-user/public/test-guqin.wav`，可直接用于测试：
- 基频: 130.81 Hz (接近 C3)
- 时长: 3 秒
- 包含 13 次谐波，模拟古琴音色

### 功能测试

1. 上传音频文件
   - 支持 MP3、WAV、OGG 等常见音频格式
   - 文件大小建议不超过 10MB
   - 音频时长建议在 5 秒以内

2. 区间选择
   - 使用输入框精确输入起止时间（毫秒）
   - 使用滑块快速选择区间
   - 实时显示选中时长

3. 音频分析
   - 点击"分析音频"按钮开始分析
   - 自动检测基频
   - 显示最多 13 倍频

4. 图表验证
   - 波形图：显示选中区间的音频波形
   - 频谱图：显示基频和倍频的相对强度
   - 热力图：显示声强随时间的变化
   - 频率区域图：分别显示低频区、中频区、高频区

### 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

# 古琴音频分析软件

专为斫琴师设计的音频频谱分析工具，用于分析古琴音色的基频、倍频和声强变化。

## 功能特性

- **音频上传**：支持 MP3、WAV、OGG 等常见音频格式
- **精确截取**：以毫秒为单位精确选择分析区间
- **基频检测**：自动检测音频的基频
- **倍频分析**：显示最多 13 倍频，过滤其他频率
- **可视化图表**：
  - 波形图：显示音频波形
  - 频谱图：显示基频和倍频的强度分布
  - 热力图：显示声强随时间的变化
  - 频率区域图：分别显示低频区、中频区、高频区

## 技术栈

- 原生 JavaScript (ES6+)
- Web Audio API
- Chart.js
- Vite
- Nginx
- Docker

## 项目结构

```
├── .env                    # 共享运行参数（端口、镜像版本），本地与容器共用
├── frontend-user/          # 用户端前端项目
│   ├── src/
│   │   ├── modules/        # 功能模块
│   │   │   ├── audioAnalyzer.js   # 音频分析器
│   │   │   ├── chartManager.js    # 图表管理器
│   │   │   └── uiController.js    # UI 控制器
│   │   ├── utils/          # 工具函数
│   │   │   └── logger.js   # 日志工具
│   │   ├── styles/         # 样式文件
│   │   │   └── main.css    # 主样式
│   │   └── main.js         # 入口文件
│   ├── index.html          # HTML 模板
│   ├── Dockerfile          # 多阶段构建（构建/运行共用一组 ARG）
│   ├── .dockerignore       # 构建上下文排除（node_modules、dist 等）
│   ├── nginx.conf.template # Nginx 配置模板（端口由环境变量渲染）
│   ├── package.json        # 项目配置
│   └── vite.config.js      # Vite 配置（读取根目录 .env）
├── docker-compose.yml      # Docker Compose 配置（参数来自 .env）
├── .gitignore              # Git 忽略文件
└── README.md               # 项目说明
```

## 本地开发

```bash
cd frontend-user
npm install
npm run dev
```

访问 http://localhost:8081（端口以根目录 `.env` 中的 `PORT` 为准）

## 频率区域说明

- **低频区**：基频 ~ 4倍频
- **中频区**：5倍频 ~ 8倍频
- **高频区**：9倍频 ~ 13倍频

这三个区域共享同一个基频，用于分析古琴音色在不同频率范围的特征。
