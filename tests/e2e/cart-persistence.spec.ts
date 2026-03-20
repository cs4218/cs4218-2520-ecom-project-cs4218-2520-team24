// Nam Dohyun
import { test, expect } from '@playwright/test';

test.describe('Cart Persistence and Synchronization', () => {
  test('should persist cart items on page reload and cross-page navigation', async ({ page }) => {
    // Start on the smartphone product page to bypass home page pagination unpredictability
    await page.goto('/product/smartphone');

    // Wait for the product to be visible. On details page, it's typically an h6 element or similar.
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible();

    // Click Add to Cart
    await addToCartBtn.click();
    
    // Verify toast notification
    await expect(page.getByText('Item Added to cart')).toBeVisible();

    // Verify nav cart badge increments to 1
    const cartBadge = page.locator('.nav-item').filter({ hasText: /cart/i });
    await expect(cartBadge).toContainText('1');

    // Reload the page and ensure the cart count is persisted via Context + localStorage
    await page.reload();
    await expect(cartBadge).toContainText('1');

    // Navigate to Cart Page
    await cartBadge.click();
    await expect(page).toHaveURL(/.*cart.*/);

    // Verify the cart summary shows the item
    const mainArea = page.locator('.cart-page');
    await expect(mainArea).toContainText(/smartphone/i);
    // There should be a "Remove" button
    await expect(page.getByRole('button', { name: /remove/i })).toBeVisible();

    // Additional cross-page persistence check
    await page.goto('/product/tablet');
    await expect(cartBadge).toContainText('1');
    await page.goto('/cart');
    await expect(mainArea).toContainText(/smartphone/i);

    // Clean up
    await page.evaluate(() => window.localStorage.removeItem('cart'));
  });
});
