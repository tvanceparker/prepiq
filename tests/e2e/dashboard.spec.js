// tests/e2e/dashboard.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should display dashboard navigation', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a[href*="dashboard"]')).toBeVisible();
    await expect(page.locator('a[href*="inventory"]')).toBeVisible();
    await expect(page.locator('a[href*="menu"]')).toBeVisible();
  });

  test('should navigate to different sections', async ({ page }) => {
    // Test navigation to inventory
    await page.click('a[href*="inventory"]');
    await expect(page).toHaveURL(/inventory/);
    
    // Test navigation to menu
    await page.click('a[href*="menu"]');
    await expect(page).toHaveURL(/menu/);
  });

  test('should display daily overview content', async ({ page }) => {
    await page.goto('/dashboard/daily-overview');
    
    // Check for typical dashboard elements
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('.card, .widget, .dashboard-item').first()).toBeVisible();
  });
});
