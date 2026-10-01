import { test, expect } from '@playwright/test'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { ImportPage } from './pages/import.page.js'
import { LibraryPage } from './pages/library.page.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const stoFixture = join(__dirname, '..', 'IRacingSetups', 'lemans_FerrariGT3_Claude_V1.sto')
const htmlFixture = join(__dirname, '..', 'IRacingSetups', 'fixed_ferrariGT3296.htm')

test.describe('Setup import and library flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(library)?$/)
  })

  test('should import a setup with overlay and view version history', async ({ page }) => {
    const importPage = new ImportPage(page)
    const libraryPage = new LibraryPage(page)

    await importPage.goto()
    await importPage.uploadSto(stoFixture)
    await importPage.uploadHtml(htmlFixture)
    await importPage.analyzeSetup()

    const sha = await importPage.getSha()
    expect(sha).toMatch(/^[0-9a-f]{64}$/i)
    expect(await importPage.hasAutoExtractedBadge()).toBe(true)

    await importPage.confirmSave()

    await expect(libraryPage.versionBadge(1)).toBeVisible()
  })

  test('should export .sto file from version with overlay', async ({ page }) => {
    const importPage = new ImportPage(page)

    await importPage.goto()
    await importPage.uploadSto(stoFixture)
    await importPage.uploadHtml(htmlFixture)
    await importPage.analyzeSetup()
    await importPage.confirmSave()

    const libraryPage = new LibraryPage(page)
    await expect(page.getByRole('button', { name: 'Export .sto' })).toBeVisible()

    const download = await libraryPage.exportSetup()
    expect(download.suggestedFilename()).toMatch(/\.sto$/)
  })
})
