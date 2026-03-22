// Nam Dohyun
import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';
import { getMongoUri } from '../mongodb-manager';

test.describe('E2E: Category Pagination', () => {
  const testId = Date.now().toString().slice(-6);
  const categorySlug = `gadgets-${testId}`;
  let categoryId: string;

  test.beforeAll(async () => {
    const mongoUri = getMongoUri();
    if (!mongoUri) throw new Error('MONGO_URI is not defined');
    
    await mongoose.connect(mongoUri);

    // 1. Create a dedicated category for pagination
    const category = await new Category({
      name: `Gadgets ${testId}`,
      slug: categorySlug,
    }).save();
    categoryId = category._id.toString();

    // 2. Seed 8 products (Assuming the limit is 6 per page)
    // This ensures page 1 has 6 items and page 2 has 2 items
    for (let i = 1; i <= 8; i++) {
      await new Product({
        name: `Gadget Item ${i} - ${testId}`,
        slug: `gadget-item-${i}-${testId}`,
        description: `Pagination test item ${i}`,
        price: 10 * i,
        category: categoryId,
        quantity: 10,
        shipping: true,
      }).save();
    }
    
    await mongoose.disconnect();
  });

  test.afterAll(async () => {
    const mongoUri = getMongoUri();
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      await Product.deleteMany({ category: categoryId });
      await Category.findByIdAndDelete(categoryId);
      await mongoose.disconnect();
    }
  });

  test('should load more products when clicking the Load More button', async ({ page }) => {
    // Navigate to our dynamic dynamic category
    await page.goto(`/category/${categorySlug}`);

    // Wait for the initial 6 product cards to load
    const productCards = page.locator('.card');
    await page.pause();
    await expect(productCards).toHaveCount(6, { timeout: 10000 });

    // Verify the "Load More" button is visible
    const loadMoreBtn = page.getByRole('button', { name: /load more/i });
    await expect(loadMoreBtn).toBeVisible();

    // Click "Load More"
    await loadMoreBtn.click();

    // After loading page 2, we expect 8 total cards and the button disappears
    await expect(productCards).toHaveCount(8, { timeout: 10000 });
    await expect(loadMoreBtn).toBeHidden();
  });
});