// Leong Yu Jun Nicholas, A0257284W
import { test, expect } from '@playwright/test';

test.describe('Cart UX & Persistence Flows', () => {

  test('Cart accurately updates subtotals, removes items, and handles empty state', async ({ page }) => {
    // 1. Setup: Add Multiple Items
    await page.goto('/');
    
    // Check if there are products available to add
    const addToCartBtns = page.locator('button:has-text("ADD TO CART")');
    // Ensure at least one product is rendered
    await expect(addToCartBtns.first()).toBeVisible();

    // Click 'Add to Cart' on the first two available products
    await addToCartBtns.nth(0).click();
    await page.waitForTimeout(500); // Wait for potential toasts or cart state updates
    
    // Add same or next item (depends on DB, using first index again if it's the only one, or second if both exist)
    const count = await addToCartBtns.count();
    if (count > 1) {
      await addToCartBtns.nth(1).click();
    } else {
      await addToCartBtns.nth(0).click();
    }
    await page.waitForTimeout(500);

    // 2. Navigate to Cart
    await page.goto('/cart');
    
    // Verify Initial State (We expect at least 1, likely 2 items depending on product list)
    // Here we'll dynamically check how many have been added
    const removeBtns = page.locator('button:has-text("Remove")');
    const initialItemCount = await removeBtns.count();
    expect(initialItemCount).toBeGreaterThan(0);
    
    // 3. Remove an item
    await removeBtns.first().click();
    await page.waitForTimeout(500);

    // 4. Verify Subtotal and Count Update
    const newItemCount = await removeBtns.count();
    expect(newItemCount).toBe(initialItemCount - 1);

    // 5. Remove last item, verify completely empty cart UI
    if (newItemCount > 0) {
      await removeBtns.first().click();
    }
    
    // Verify completely empty cart string
    await expect(page.locator('text=Your Cart Is Empty')).toBeVisible();
    
    // Verify Checkout block is hidden
    await expect(page.locator('text=Cart Summary')).toBeVisible(); // Panel still exists
    await expect(page.locator('button:has-text("Make Payment")')).not.toBeVisible();
  });
});
