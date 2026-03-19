import { test, expect } from '@playwright/test';

test.describe('Similar Products Add to Cart E2E', () => {
  test('should navigate to a product and add a similar product to cart', async ({ page }) => {
    // Capture browser console logs for debugging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Product') || msg.text().includes('Similar')) {
        console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
      }
    });

    // 1. Navigate directly to the smartphone details page.
    // This is more robust than clicking from the home page which might have paging or filters.
    await page.goto('/product/smartphone');
    
    // 2. Use a more flexible URL check
    await expect(page).toHaveURL(/\/product\//);
    
    // 3. Check for the similar products section
    const similarHeading = page.getByRole('heading', { name: /similar products/i });
    await expect(similarHeading).toBeVisible();
    
    // If this fails, we know for sure the API returned empty or errored
    await expect(page.getByText(/no similar products found/i)).not.toBeVisible();

    // 4. Find the "Tablet" card within the similar products section
    const tabletItem = page.locator('.similar-products .card').filter({ hasText: /tablet/i }).first();
    await expect(tabletItem).toBeVisible();
    
    // 5. Action: Add to Cart
    await tabletItem.getByRole('button', { name: /add to cart/i }).click();
    
    // 6. Navigation and Verification - Use the badge count specifically
    const cartCount = page.locator('.ant-badge-count');
    await expect(cartCount).toHaveText('1');
    
    const cartLink = page.getByRole('link', { name: /cart/i });
    await cartLink.click();
    await expect(page).toHaveURL(/.*cart.*/);
    
    // 7. Final check in the main cart area
    await expect(page.getByRole('main')).toContainText(/tablet/i);
  });
});