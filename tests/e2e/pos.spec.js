// tests/e2e/pos.spec.js
const { test, expect } = require('@playwright/test');

test.describe('POS System', () => {
  test('should login and register device', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Wait for page to load
    await page.waitForSelector('input[type="password"]');

    // Fill login form
    await page.fill('input[type="text"]', 'testuser2');
    await page.fill('input[type="password"]', 'password');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for login to complete and device registration dialog to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Check if device registration dialog is shown
    const dialogTitle = await page.textContent('[role="dialog"] h2');
    expect(dialogTitle).toContain('Register Device');

    console.log('✅ Device registration dialog appeared as expected');
  });

  test('should navigate to POS page', async ({ page }) => {
    // Navigate to POS page directly
    await page.goto('http://localhost:3000/pos');

    // Should redirect to login if not authenticated
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');

    console.log('✅ POS page redirects to login when not authenticated');
  });

  test('should navigate to kitchen display', async ({ page }) => {
    // Navigate to kitchen page directly
    await page.goto('http://localhost:3000/kitchen');

    // Should redirect to login if not authenticated
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');

    console.log('✅ Kitchen page redirects to login when not authenticated');
  });
});
