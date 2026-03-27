import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
} as any);
