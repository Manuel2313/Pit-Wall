import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/playwright.config.ts'],
    include: ['packages/**/*.test.ts', 'apps/web/src/**/*.spec.ts', 'test/**/*.test.ts'],
  },
})