import { defineConfig } from 'vite';

/**
 * 微信小游戏构建：把 src/wechat/main.js 打成单文件 IIFE（game.js）。
 * 小游戏不支持 ES module 加载，因此必须是 IIFE，且不能有代码分割。
 */
export default defineConfig({
  build: {
    target: 'es2017',
    outDir: 'wechat-dist',
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: 'src/wechat/main.js',
      name: 'HachicatGame',
      formats: ['iife'],
      fileName: () => 'game.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});