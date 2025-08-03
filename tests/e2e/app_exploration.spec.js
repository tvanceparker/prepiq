const { test, expect } = require('@playwright/test');

test.describe('PrepIQ Application Exploration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
  });

  test('Login and explore all pages', async ({ page }) => {
    // Login with testuser2
    await page.fill('input[name="username"]', 'testuser2');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForTimeout(2000);

    // Take a screenshot of the dashboard
    await page.screenshot({ path: 'screenshots/01-dashboard.png', fullPage: true });

    // Navigate to different sections and take screenshots
    const sections = [
      { name: 'Menu', selector: 'a[href*="menu"]', screenshot: '02-menu.png' },
      { name: 'Inventory', selector: 'a[href*="inventory"]', screenshot: '03-inventory.png' },
      { name: 'Sales Forecast', selector: 'a[href*="forecast"]', screenshot: '04-forecast.png' },
      { name: 'Prep Schedule', selector: 'a[href*="prep"]', screenshot: '05-prep.png' },
      { name: 'Analytics', selector: 'a[href*="analytics"]', screenshot: '06-analytics.png' },
      { name: 'Team', selector: 'a[href*="team"]', screenshot: '07-team.png' },
      { name: 'Settings', selector: 'a[href*="settings"]', screenshot: '08-settings.png' },
      { name: 'Admin', selector: 'a[href*="admin"]', screenshot: '09-admin.png' }
    ];

    for (const section of sections) {
      try {
        // Look for navigation link
        const navLink = await page.locator(section.selector).first();
        if (await navLink.isVisible()) {
          await navLink.click();
          await page.waitForTimeout(1500);
          await page.screenshot({ path: `screenshots/${section.screenshot}`, fullPage: true });
          console.log(`✓ Captured ${section.name} page`);
        } else {
          console.log(`✗ ${section.name} navigation not found`);
        }
      } catch (error) {
        console.log(`✗ Error navigating to ${section.name}: ${error.message}`);
      }
    }

    // Check for any forms and interactive elements
    await page.screenshot({ path: 'screenshots/10-final-state.png', fullPage: true });
  });

  test('Check for errors and console warnings', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    // Login
    await page.fill('input[name="username"]', 'testuser2');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navigate through a few pages to catch any errors
    const quickNav = ['menu', 'inventory', 'forecast'];
    for (const nav of quickNav) {
      try {
        await page.goto(`http://localhost:3000/${nav}`);
        await page.waitForTimeout(1000);
      } catch (error) {
        console.log(`Error navigating to /${nav}: ${error.message}`);
      }
    }

    // Log all console messages
    console.log('Console Messages Found:');
    consoleMessages.forEach(msg => console.log(msg));
  });
});
