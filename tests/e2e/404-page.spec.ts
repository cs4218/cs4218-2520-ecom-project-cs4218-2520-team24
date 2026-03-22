// Leong Yu Jun Nicholas, A0257284W
import { test, expect } from '@playwright/test';

test.describe('E2E: 404 Error Handling', () => {
  const testId = Date.now().toString().slice(-6);

  test('Intentionally navigate to a dead link to test the 404 page UI handling', async ({ page }) => {
    // 1. User mistypes or clicks corrupted referral
    await page.goto(`/this-route-definitely-does-not-exist-${testId}`);

    // 2. Verify 404 UX page container loads
    await expect(page.locator('h1.pnf-title')).toHaveText('404');
    await expect(page.locator('h2.pnf-heading')).toHaveText('Oops ! Page Not Found');

    // 3. Follow structural bounds - navigate back gracefully
    const goBackBtn = page.locator('a.pnf-btn');
    await expect(goBackBtn).toHaveText('Go Back');
    await goBackBtn.click();

    // 4. Validate routing dropped us safely home
    await expect(page).toHaveURL('/');
  });

  test('404 page sets the correct document title', async ({ page }) => {
    await page.goto(`/nonexistent-page-${testId}`);

    // Verify the document title contains the expected 404 page title
    await expect(page).toHaveTitle(/page not found/i);
  });
});
