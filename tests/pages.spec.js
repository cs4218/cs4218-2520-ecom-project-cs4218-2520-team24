// Leong Yu Jun Nicholas, A0257284W
import { test, expect } from '@playwright/test';

test.describe('Static Routine & Recovery Flows', () => {

  test('404 Flow: User hits bad route and recovers via UI navigation', async ({ page }) => {
    // 1. Intentionally navigate to broken route
    await page.goto('/this-route-does-not-exist');

    // 2. Assert Not Found View Elements
    // From Pagenotfound.js: `<h1 className="pnf-title">404</h1>` and `<h2 className="pnf-heading">Oops ! Page Not Found</h2>`
    await expect(page.locator('.pnf-title')).toHaveText('404');
    await expect(page.locator('.pnf-heading')).toHaveText('Oops ! Page Not Found');

    // 3. User Recovery (Clicking the go back / home button)
    const goBackBtn = page.locator('a.pnf-btn:has-text("Go Back")');
    await expect(goBackBtn).toBeVisible();
    await goBackBtn.click();

    // 4. Assert returned to home
    await expect(page).toHaveURL('/');
  });

  test('Policy Page: Validates legally required content renders', async ({ page }) => {
    // Navigate via UI direct
    await page.goto('/policy');

    // Validate layout and static text
    // Assuming Policy.js renders a simple Layout wrapping privacy policies
    // with some text or image representing policies
    const container = page.locator(':has-text("Privacy Policy")').first();
    await expect(container).toBeVisible();
    
    // Some general generic sanity check to ensure the page didn't throw a react crash
    const mainBody = page.locator('.contactus'); // Check main policy class from standard repo
    await expect(mainBody).toBeVisible();
  });
});