// Nam Dohyun
import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';
import { getMongoUri } from '../mongodb-manager';

test.describe('HomePage Pagination', () => {
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

  test('should load more products when clicking Load More', async ({ page }) => {
    // Navigate to homepage
    // Seed has 10 total products (2 Electronics + 8 Gadgets) which is > 6 perPage,
    // so the Load More button will appear after the initial 6 load.
    await page.goto('/');

    // Wait for categories to load (verifies the page is rendered)
    await expect(page.getByRole('checkbox', { name: /electronics/i })).toBeVisible();

    // Wait for the initial 6 product cards to load from the real DB
    await expect(page.locator('.card:has(.card-img-top)')).toHaveCount(6, { timeout: 10000 });

    // Click "Load More" — real DB call to /api/v1/product/product-list/2
    const loadMoreBtn = page.getByRole('button', { name: /load more/i });
    await expect(loadMoreBtn).toBeVisible();
    await loadMoreBtn.click();

    // After loading page 2, total = 10 products (6 + 4 more).
    // The button disappears because all 10 are loaded.
    await expect(page.locator('.card:has(.card-img-top)')).toHaveCount(10, { timeout: 10000 });
    await expect(loadMoreBtn).toBeHidden();
  });
});
