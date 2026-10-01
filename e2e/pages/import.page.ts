import { type Page } from '@playwright/test'

export class ImportPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/import')
    await this.page.locator('h1:has-text("Import Setup")').waitFor()
  }

  async uploadSto(filePath: string): Promise<void> {
    await this.page.locator('input[accept=".sto"]').setInputFiles(filePath)
    await this.page.getByText('Selected:').first().waitFor()
  }

  async uploadHtml(filePath: string): Promise<void> {
    await this.page.locator('input[accept=".htm,.html"]').setInputFiles(filePath)
    await this.page.getByText('Selected:').nth(1).waitFor()
  }

  async analyzeSetup(): Promise<void> {
    await this.page.getByRole('button', { name: 'Analyze Setup' }).click()
    await this.page.locator('h2:has-text("Setup Preview")').waitFor()
  }

  async getSha(): Promise<string> {
    return (await this.page.locator('dd.font-mono').first().textContent() ?? '').trim()
  }

  async hasAutoExtractedBadge(): Promise<boolean> {
    return this.page.locator('span.bg-green-100:has-text("Auto-extracted")').isVisible()
  }

  async confirmSave(): Promise<void> {
    await this.page.locator('button.bg-green-600:has-text("Confirm & Save")').click()
    await this.page.waitForURL(/\/library\//)
  }
}
