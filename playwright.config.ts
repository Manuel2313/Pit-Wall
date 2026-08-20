import { defineConfig, devices } from '@playwright/test'

const isSmokeTest = process.env.PLAYWRIGHT_PROJECT === 'sto-parser-smoke'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'sto-parser-smoke',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /sto-parser-smoke\.spec\.ts/,
    },
  ],
  ...(!isSmokeTest && {
    webServer: {
      command: 'npm run start:web',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  }),
})