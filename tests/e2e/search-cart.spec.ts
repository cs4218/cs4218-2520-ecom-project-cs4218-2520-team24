// Nam Dohyun
import { test, expect } from '@playwright/test';

test.describe('Search and Add to Cart E2E', () => {
  test('should search for a product and add it to cart', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByPlaceholder(/search/i); 
    await searchInput.fill('Smartphone');
    await page.getByRole('button', { name: /search/i }).click();
    
    await expect(page).toHaveURL(/.*search.*/);
    await expect(page.getByRole('heading', { name: /search results/i })).toBeVisible();
      
    // Find the product item more robustly by its heading within a card
    const productHeading = page.getByRole('heading', { name: /smartphone/i });
    const productItem = page.locator('.card').filter({ has: productHeading });
    await expect(productItem).toBeVisible();
    
    await productItem.getByRole('button', { name: /add to cart/i }).click();
    
    // The cart badge is often outside the link itself but inside the list item container
    const cartBadge = page.locator('li').filter({ hasText: /cart/i });
    // Verify the cart count
    await expect(cartBadge).toContainText('1');
    
    await cartBadge.getByRole('link').click();
    await expect(page).toHaveURL(/.*cart.*/);
    
    await expect(page.getByRole('main')).toContainText(/smartphone/i);
  });
});