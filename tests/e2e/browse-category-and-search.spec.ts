import { test, expect } from '@playwright/test';

test.describe('E2E: Discovery Flow', () => {
  test('should navigate from categories to a product and perform a search', async ({ page }) => {
    // 1. Use relative path (best practice: set baseURL in playwright.config.ts)
    await page.goto('/');
    
    // 2. Navigation: Using roles is more robust than relying on exact link structures
    const nav = page.getByRole('navigation');
    await nav.getByRole('link', { name: /categories/i }).click(); 
    // Click "All Categories" inside the dropdown to actually navigate
    await page.getByRole('link', { name: /all categories/i }).click();

    // 3. Category Selection
    await expect(page).toHaveURL(/\/categories/);
    // Clicking 'Electronics' - using a regex /i makes it case-insensitive
    await page.getByRole('link', { name: /electronics/i }).click();
    
    // 4. Verification: Check that we are on a category page
    await expect(page).toHaveURL(/\/category\//);
    // Use a more flexible heading check
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/category/i);

    // 5. Product Interaction: Target the "Smartphone" card specifically
    const productCard = page.locator('.card, .product-item').filter({ hasText: /smartphone/i }).first();
    await productCard.getByRole('button', { name: /more details/i }).click();
    
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByRole('heading', { name: /product details/i })).toBeVisible();

    // 6. Global Search
    // Use getByPlaceholder if 'Search' is the ghost text in the box
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Smartphone');
    await page.getByRole('button', { name: /search/i }).click();

    // 7. Final Assertions
    await expect(page).toHaveURL(/.*search.*/);
    
    // Using a regex to be resilient to typography/case changes
    await expect(page.getByRole('heading', { name: /search results/i })).toBeVisible();
    
    // Ensure at least one product appeared in the results
    await expect(page.getByRole('button', { name: /more details/i }).first()).toBeVisible();
  });
});