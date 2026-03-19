import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';
import { getMongoUri } from '../mongodb-manager';

test.describe('E2E: Discovery Flow', () => {
  const testId = Date.now().toString().slice(-6);
  const productNames = Array.from({ length: 5 }, (_, i) => `Gadget ${i} - ${testId}`);
  let electronicsCategoryId: string;

  test.beforeAll(async () => {
    // FIX: Look for URI in both manager and process.env
    const mongoUri = getMongoUri();
    
    if (!mongoUri) {
      throw new Error('❌ Test Worker could not find MONGO_URL. Check global-setup.ts');
    }

    await mongoose.connect(mongoUri);
    
    // Find the standard Electronics category seeded in globalSetup
    const category = await new Category({
      name: `Special Electronics ${testId}`,
      slug: `electronics-${testId}`,
    }).save();
    electronicsCategoryId = category._id.toString();
    
    // Loop to create test-specific products
    for (const name of productNames) {
      await new Product({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description: `Test product ${name}`,
        price: 100,
        category: electronicsCategoryId,
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
      await Product.deleteMany({ name: { $regex: testId } });
      await Category.findByIdAndDelete(electronicsCategoryId);
      await mongoose.disconnect();
    }
  });

  test('should navigate and see the seeded loop data', async ({ page }) => {
    await page.goto('/');
    
    // Navigation to Electronics
    await page.getByRole('link', { name: /categories/i }).click(); 
    await page.getByRole('link', { name: /all categories/i }).click();
    await page.getByRole('link', { name: `electronics-${testId}` }).click();

    // Verify one of our loop products is there
    await expect(page.getByText(productNames[0])).toBeVisible();
  });
});