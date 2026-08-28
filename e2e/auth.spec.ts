import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should show login form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Sign in to your account')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in')
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('.bg-red-50')).toContainText('Invalid email or password')
  })

  test('should navigate to register page', async ({ page }) => {
    await page.click('a:has-text("create a new account")')
    await expect(page).toHaveURL(/\/register/)
    await expect(page.locator('h2')).toContainText('Create your account')
  })

  test('should register, login, and persist session on reload', async ({ page }) => {
    // Register a new user
    await page.goto('/register')
    const testEmail = `test${Date.now()}@example.com`
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to home page after successful registration
    await expect(page).toHaveURL('/')
    await expect(page.locator('header')).toContainText(testEmail)

    // Reload page - session should persist
    await page.reload()
    await expect(page.locator('header')).toContainText(testEmail)

    // Logout
    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show error for duplicate email on register', async ({ page }) => {
    await page.goto('/register')
    const testEmail = `duplicate${Date.now()}@example.com`

    // First registration
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')

    // Logout
    await page.click('button:has-text("Logout")')

    // Try to register with same email
    await page.goto('/register')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page.locator('.bg-red-50')).toContainText('already exists')
  })

  test('should show validation errors on register form', async ({ page }) => {
    await page.goto('/register')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
    await expect(page.locator('text=Please confirm your password')).toBeVisible()
  })

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'different')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should navigate to login from register page', async ({ page }) => {
    await page.goto('/register')
    await page.click('a:has-text("Sign in")')
    await expect(page).toHaveURL(/\/login/)
  })
})