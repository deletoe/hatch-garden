import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'art',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
