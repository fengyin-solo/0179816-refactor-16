## How to Run

### 配置口径（单一来源）

端口和构建用 Node 版本统一定义在仓库根目录的 **`.env`** 中，本地开发与容器启动共用，无需改多处：

| 变量 | 默认值 | 作用范围 |
|------|--------|----------|
| `PORT` | `8081` | Vite dev/preview、nginx 监听、容器端口映射、健康检查 |
| `NODE_VERSION` | `20` | 构建镜像的 `node:${NODE_VERSION}-alpine`；本地版本约束见 `package.json` 的 `engines.node` |

修改后两种启动方式同时生效。个人临时覆盖可使用 `.env.local`（已被 git 忽略）。

### 方式一：容器启动

1. 确保已安装 Docker 和 Docker Compose（依赖 BuildKit 缓存挂载，建议 Docker 20.10+ / Compose v2）

2. 在项目根目录执行：
```bash
docker compose up --build -d
```

3. 访问应用（地址端口与 `.env` 的 `PORT` 一致，默认 8081）：
- 用户端: http://localhost:8081

4. 查看日志与停止服务：
```bash
docker compose logs -f
docker compose down
```

### 方式二：本地开发

要求 Node.js 版本满足 `package.json` 中的 `engines.node`（与 `.env` 的 `NODE_VERSION` 一致）。

```bash
cd frontend-user
npm ci          # 或 npm install
npm run dev     # 端口取自根目录 .env 的 PORT
```

访问 http://localhost:8081（或 `.env` 中设置的端口）。

生产构建本地预览：

```bash
npm run build
npm run preview # 同样使用 .env 的 PORT
```

### 依赖缓存说明

- **依赖分层缓存**：Dockerfile 中先 `COPY package*.json` 再 `npm ci`，依赖清单不变时复用 Docker 层缓存，源码修改不会触发重新安装。
- **npm 下载缓存**：`npm ci` 使用 BuildKit `--mount=type=cache,target=/root/.npm`，即使依赖层失效也无需重新下载包。
  - 启用方式：`DOCKER_BUILDKIT=1 docker compose build`（Docker 23+ 默认开启）。
  - 旧版 Docker 不识别缓存挂载时会自动回退为普通安装，不影响正确性。
- 本地开发的 npm 缓存位于 `~/.npm`，`node_modules` 已在 `.dockerignore` 中排除，不会污染镜像构建。

### 构建失败排查

| 现象 | 原因与处理 |
|------|-----------|
| `npm ci` 阶段失败、报 `EUSAGE` 或依赖冲突 | `package-lock.json` 与 `package.json` 不同步。本地执行 `npm install` 更新 lock 文件后提交，再重新构建 |
| `npm ci` 报网络超时 / `ECONNRESET` | 网络问题，重跑即可命中已下载的缓存；也可配置 npm 镜像：`npm config set registry https://registry.npmmirror.com` |
| `npm run build` 阶段失败（语法/导入错误） | 失败只影响编译步，已缓存的依赖层保留不动；修复源码后重新 `docker compose build` 只会重跑编译 |
| 容器启动后无法访问 / 健康检查 unhealthy | 确认 `.env` 中 `PORT` 未被占用，宿主防火墙已放行；`docker compose logs frontend-user` 查看 nginx 日志 |
| 改了 `.env` 的端口但容器仍监听旧端口 | 端口是 build arg 与运行环境变量，需 `docker compose up --build -d` 重新构建，不能只 restart |
| 缓存疑似导致构建结果过旧 | `docker compose build --no-cache frontend-user` 跳过所有层缓存重新构建 |

## Services

| 服务名称 | 端口 | 描述 |
|---------|------|------|
| frontend-user | 8081（默认，由 `.env` 的 `PORT` 定义） | 古琴音频分析软件用户端 |

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
│   ├── Dockerfile          # Docker 构建文件（参数化多阶段构建）
│   ├── .dockerignore       # Docker 构建上下文排除规则
│   ├── nginx.conf          # Nginx 配置模板（${PORT} 启动时注入）
│   ├── package.json        # 项目配置（含 engines.node 版本约束）
│   └── vite.config.js      # Vite 配置（读取根目录 .env）
├── docker-compose.yml      # Docker Compose 配置（参数来自 .env）
├── .env                    # 单一配置口径：PORT / NODE_VERSION
├── .gitignore              # Git 忽略文件
└── README.md               # 项目说明
```

## 本地开发

```bash
cd frontend-user
npm ci
npm run dev
```

访问 http://localhost:8081（端口取自根目录 `.env` 的 `PORT`，详见上文「配置口径」）。

## 频率区域说明

- **低频区**：基频 ~ 4倍频
- **中频区**：5倍频 ~ 8倍频
- **高频区**：9倍频 ~ 13倍频

这三个区域共享同一个基频，用于分析古琴音色在不同频率范围的特征。
