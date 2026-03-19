// Nam Dohyun
import { test, expect } from '@playwright/test';

test.describe('Similar Products Deep Navigation', () => {
  test('should reload product page with new product details when navigating to a similar product', async ({ page }) => {
    // Electronics has only Smartphone + Tablet, so the related-product endpoint
    // (limit 3) will always return Tablet as the similar product for Smartphone.
    // No API mocking needed — the real DB guarantees this.

    // 1. Start on the "Smartphone" product page
    await page.goto('/product/smartphone');

    // Verify we are on the smartphone product details page
    await expect(page).toHaveURL(/\/product\/smartphone/);
    await expect(page.getByRole('heading', { name: /product details/i })).toBeVisible();

    // 2. Look for the 'Tablet' in the similar products section
    const similarHeading = page.getByRole('heading', { name: /similar products/i });
    await expect(similarHeading).toBeVisible();

    // Find the tablet card — guaranteed by the 2-product Electronics category
    const tabletCard = page.locator('.card').filter({ has: page.getByRole('heading', { name: /tablet/i }) });
    await expect(tabletCard).toBeVisible();

    // 3. Click "More Details" on the similar product
    await tabletCard.getByRole('button', { name: /more details/i }).click();

    // 4. Verify the URL navigated to the new product's page
    await expect(page).toHaveURL(/\/product\/tablet/);

    // 5. The "Product Details" heading is always rendered on the ProductDetails page
    await expect(page.getByRole('heading', { name: /product details/i })).toBeVisible();

    // The URL confirms we are no longer on the smartphone page
    await expect(page).not.toHaveURL(/\/product\/smartphone/);
  });
});
