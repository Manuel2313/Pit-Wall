import { defineConfig } from 'vitest/config'
import angular from '@analogjs/vite-plugin-angular'
import { resolve } from 'path'

export default defineConfig({
  plugins: [angular({ 
    tsconfig: 'tsconfig.spec.json',
    workspaceRoot: resolve(__dirname)
  })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: ['src/app/auth/**/*.spec.ts'],
  },
})