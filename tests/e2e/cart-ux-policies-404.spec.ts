// Leong Yu Jun Nicholas, A0257284W
import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import { getMongoUri } from '../mongodb-manager';
import Product from '../../models/productModel.js';
import Category from '../../models/categoryModel.js';

test.describe('E2E: Cart UX, Policies & Error Handling', () => {
  const testId = Date.now().toString().slice(-6);
  const products = [
    { name: `Item 1 ${testId}`, slug: `i1-${testId}`, description: 'Desc 1', price: 10, quantity: 5 },
    { name: `Item 2 ${testId}`, slug: `i2-${testId}`, description: 'Desc 2', price: 20, quantity: 5 }
  ];

  test.beforeAll(async () => {
    // 1. Establish DB Connection for localized seeded data guarantees
    const mongoUri = getMongoUri();
    if (!mongoUri) throw new Error('Test Worker could not find MONGO_URL.');
    await mongoose.connect(mongoUri);

    // 2. Seed a custom category and the items
    const category = await new Category({ name: `UX Cat ${testId}`, slug: `ux-cat-${testId}` }).save();
    await new Product({ ...products[0], category: category._id }).save();
    await new Product({ ...products[1], category: category._id }).save();
  });

  test('Cart removal interactions and empty state handling', async ({ page }) => {
    await page.goto('/');

    // Isolate test products by filtering on the uniquely created category
    const categoryCheckbox = page.getByRole('checkbox', { name: `UX Cat ${testId}` });
    await expect(categoryCheckbox).toBeVisible();
    await categoryCheckbox.check();

    // 1. Add seeded items to cart dynamically (now safely isolated)
    for (const prod of products) {
      const card = page.locator('.card', { hasText: prod.name });
      await expect(card).toBeVisible();
      await card.locator('button:has-text("ADD TO CART")').click();
      await page.waitForTimeout(500); // UI Toast Wait
    }

    // 2. Navigate to Cart
    await page.goto('/cart');

    // 3. Verify Initial UX item count logic
    await expect(page.locator(`text=You Have 2 items in your cart`)).toBeVisible();
    await expect(page.locator('.card:has-text("Item 1")')).toBeVisible();

    // 4. Test Product Removal
    const removeBtns = page.locator('button:has-text("Remove")');
    await removeBtns.first().click();

    // 5. Verify live array mutations reflect cleanly in the DOM without refresh
    await expect(page.locator(`text=You Have 1 items in your cart`)).toBeVisible();

    // 6. Test final boundary condition (Empty Cart state triggers)
    await removeBtns.first().click();
    await expect(page.locator('text=Your Cart Is Empty')).toBeVisible();
  });

  test('Privacy Policy page routing and document visibility', async ({ page }) => {
    // 1. Navigate directly to policy from the global layout footer usually
    await page.goto('/policy');

    // 2. Assert text content renders correctly without 500s or blank templates
    await expect(page.locator('h1.bg-dark')).toHaveText('PRIVACY POLICY');
    // Ensure standard generic styling mapping is functioning
    await expect(page.locator('.contactus')).toBeVisible();
    await expect(page.locator('p').nth(0)).not.toBeEmpty();
  });

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
});
