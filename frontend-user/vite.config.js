import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'

// envDir 指向仓库根目录，使本地开发与容器共用根目录的同一份 .env（PORT）
const rootDir = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  const port = Number(env.PORT ?? 8081)

  return {
    envDir: rootDir,
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
