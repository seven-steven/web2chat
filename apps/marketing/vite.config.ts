import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  // GitHub Pages 项目子路径部署：部署 job 传 VITE_BASE=/web2chat/，本地 dev /
  // CI 主验证链路（site:build + site:verify）默认 '/' 不变。
  base: process.env.VITE_BASE ?? '/',
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
