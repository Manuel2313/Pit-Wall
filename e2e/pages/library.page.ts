import { type Download, type Locator, type Page } from '@playwright/test'

export class LibraryPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/library')
  }

  async setupRowCount(): Promise<number> {
    return this.page.locator('tbody tr').count()
  }

  async openFirstSetup(): Promise<void> {
    await this.page.locator('button:has-text("View")').first().click()
  }

  versionBadge(n: number): Locator {
    return this.page.locator('span.text-indigo-600.font-bold', { hasText: `v${n}` })
  }

  async exportSetup(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByRole('button', { name: 'Export .sto' }).click(),
    ])
    return download
  }

  async backToLibrary(): Promise<void> {
    await this.page.getByRole('button', { name: 'Back to Library' }).click()
  }

  async emptyStateVisible(): Promise<boolean> {
    return this.page.locator('h3:has-text("No setups found")').isVisible()
  }
}
