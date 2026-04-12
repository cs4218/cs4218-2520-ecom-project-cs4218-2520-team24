// Nam Dohyun
import { test, expect } from '@playwright/test';

test.describe('Complex Filters', () => {
  test('should selectively filter products by category and price simultaneously', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[BROWSER ERROR] ${msg.text()}`);
      }
    });

    await page.goto('/');

    // 1. Wait for categories and price filters to be visible
    const electronicsCheckbox = page.getByRole('checkbox', { name: /electronics/i });
    await expect(electronicsCheckbox).toBeVisible();
    const priceRadio = page.getByRole('radio', { name: /\$100 or more/i });
    await expect(priceRadio).toBeVisible();

    // 2. Select the 'Electronics' category checkbox
    //    Real DB call: /api/v1/product/product-filters with { checked: [electronicsId] }
    //    Electronics has Smartphone ($999) + Tablet ($599) = 2 products
    const filterApiCall = page.waitForResponse(response =>
      response.url().includes('/api/v1/product/product-filters') && response.status() === 200
    );
    await electronicsCheckbox.check();
    await filterApiCall;

    await expect(page.locator('.card:has(.card-title)')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: /smartphone/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /tablet/i })).toBeVisible();

    // 3. Add price filter "$0 to 19" — neither Smartphone ($999) nor Tablet ($599) qualifies
    //    Real DB call: /api/v1/product/product-filters with { checked: [electronicsId], radio: [0,19] }
    //    Expected: 0 products
    const priceZeroToNineteen = page.getByRole('radio', { name: /\$0 to 19/i });
    const emptyFilterApiCall = page.waitForResponse(response =>
      response.url().includes('/api/v1/product/product-filters') && response.status() === 200
    );
    await priceZeroToNineteen.check();
    await emptyFilterApiCall;

    await expect(page.locator('.card:has(.card-title)')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /smartphone/i })).not.toBeVisible();

    // 4. Switch price filter to "$100 or more" — both Smartphone and Tablet qualify
    //    Real DB call: /api/v1/product/product-filters with { checked: [electronicsId], radio: [100,9999] }
    //    Expected: 2 products
    const validFilterApiCall = page.waitForResponse(response =>
      response.url().includes('/api/v1/product/product-filters') && response.status() === 200
    );
    await priceRadio.check();
    await validFilterApiCall;

    await expect(page.locator('.card:has(.card-title)')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: /smartphone/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /tablet/i })).toBeVisible();
  });
});
