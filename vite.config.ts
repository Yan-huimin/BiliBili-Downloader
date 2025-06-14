import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  "base": './',
    "build": {
    outDir: 'dist-react',
  },
  server: {
    port: 5123, // 这个端口可以自定义
    strictPort: true
  },
})
