import { test, expect } from '@playwright/test'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { ImportPage } from './pages/import.page.js'
import { LibraryPage } from './pages/library.page.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const stoFixture = join(__dirname, '..', 'IRacingSetups', 'lemans_FerrariGT3_Claude_V1.sto')

async function registerUser(page: import('@playwright/test').Page, email: string): Promise<void> {
  await page.goto('/register')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', 'password123')
  await page.fill('input[name="confirmPassword"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(library)?$/)
}

test.describe('User data isolation', () => {
  test('user A setups are not visible to user B', async ({ page }) => {
    const ts = Date.now()
    const emailA = `userA${ts}@example.com`
    const emailB = `userB${ts}@example.com`

    await registerUser(page, emailA)

    const importPage = new ImportPage(page)
    await importPage.goto()
    await importPage.uploadSto(stoFixture)
    await importPage.analyzeSetup()
    await importPage.confirmSave()

    await page.waitForURL(/\/library\//)

    await page.locator('button:has-text("Logout")').click()
    await page.waitForURL(/\/login/)

    await registerUser(page, emailB)

    const libraryPage = new LibraryPage(page)
    await libraryPage.goto()

    expect(await libraryPage.emptyStateVisible()).toBe(true)
  })
})
