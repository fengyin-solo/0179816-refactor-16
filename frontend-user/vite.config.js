import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'

// 端口等运行参数统一定义在仓库根目录的 .env，
// 本地开发（npm run dev / preview）与容器启动共用同一份。
// 也可用 shell 环境变量临时覆盖，如：PORT=9000 npm run dev
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(process.cwd(), '..'), '')
  const port = Number(env.PORT) || 8081

  return {
    server: {
      host: '0.0.0.0',
      port
    },
    preview: {
      host: '0.0.0.0',
      port
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets'
    }
  }
})
