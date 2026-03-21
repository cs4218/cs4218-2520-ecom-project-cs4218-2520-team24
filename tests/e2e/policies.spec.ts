// Leong Yu Jun Nicholas, A0257284W
import { test, expect } from '@playwright/test';

test.describe('E2E: Policies', () => {
  test('Privacy Policy page routing and document visibility', async ({ page }) => {
    // 1. Navigate directly to policy from the global layout footer usually
    await page.goto('/policy');

    // 2. Assert text content renders correctly without 500s or blank templates
    await expect(page.locator('h1.bg-dark')).toHaveText('PRIVACY POLICY');
    // Ensure standard generic styling mapping is functioning
    await expect(page.locator('.contactus')).toBeVisible();
    await expect(page.locator('p').nth(0)).not.toBeEmpty();
  });

  test('Privacy Policy page renders the contact image', async ({ page }) => {
    await page.goto('/policy');

    // Verify the policy-page image loads and is visible
    const policyImg = page.locator('img[alt="contactus"]');
    await expect(policyImg).toBeVisible();
  });
});
