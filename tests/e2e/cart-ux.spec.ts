// Leong Yu Jun Nicholas, A0257284W
import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import { getMongoUri } from '../mongodb-manager';
import Product from '../../models/productModel.js';
import Category from '../../models/categoryModel.js';

test.describe('E2E: Cart UX', () => {
  const testId = Date.now().toString().slice(-6);
  const products = [
    { name: `Item 1 ${testId}`, slug: `i1-${testId}`, description: 'Desc 1', price: 10, quantity: 5 },
    { name: `Item 2 ${testId}`, slug: `i2-${testId}`, description: 'Desc 2', price: 20, quantity: 5 }
  ];

  let testCategory: any;

  test.beforeAll(async () => {
    // 1. Establish DB Connection for localized seeded data guarantees
    const mongoUri = getMongoUri();
    if (!mongoUri) throw new Error('Test Worker could not find MONGO_URL.');
    await mongoose.connect(mongoUri);

    // 2. Seed a custom category and the items
    testCategory = await new Category({ name: `UX Cat ${testId}`, slug: `ux-cat-${testId}` }).save();
    await new Product({ ...products[0], category: testCategory._id }).save();
    await new Product({ ...products[1], category: testCategory._id }).save();
  });

  test.afterAll(async () => {
    // Optionally clean up
    if (mongoose.connection.readyState === 1 && testCategory) {
      await Product.deleteMany({ category: testCategory._id });
      await Category.findByIdAndDelete(testCategory._id);
    }
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
    await expect(page.locator(`.card:has-text("${products[0].name}")`)).toBeVisible();

    // 4. Test Product Removal
    const removeBtns = page.locator('button:has-text("Remove")');
    await removeBtns.first().click();

    // 5. Verify live array mutations reflect cleanly in the DOM without refresh
    await expect(page.locator(`text=You Have 1 items in your cart`)).toBeVisible();

    // 6. Test final boundary condition (Empty Cart state triggers)
    await removeBtns.first().click();
    await expect(page.locator('text=Your Cart Is Empty')).toBeVisible();
  });

  test('Cart items display product details: name, description, price, and image', async ({ page }) => {
    await page.goto('/');

    // 1. Isolate and add only the first test product
    const categoryCheckbox = page.getByRole('checkbox', { name: `UX Cat ${testId}` });
    await expect(categoryCheckbox).toBeVisible();
    await categoryCheckbox.check();

    const card = page.locator('.card', { hasText: products[0].name });
    await expect(card).toBeVisible();
    await card.locator('button:has-text("ADD TO CART")').click();
    await page.waitForTimeout(500);

    // 2. Navigate to Cart
    await page.goto('/cart');

    // 3. Verify product name
    await expect(page.locator(`text=${products[0].name}`)).toBeVisible();

    // 4. Verify product description (truncated to 30 chars in CartPage.js)
    const expectedDesc = products[0].description.substring(0, 30);
    await expect(page.locator(`text=${expectedDesc}`)).toBeVisible();

    // 5. Verify product price is displayed
    await expect(page.locator(`text=Price : ${products[0].price}`)).toBeVisible();

    // 6. Verify product image renders with correct alt text
    const productImg = page.locator(`img[alt="${products[0].name}"]`);
    await expect(productImg).toBeVisible();
  });
});
