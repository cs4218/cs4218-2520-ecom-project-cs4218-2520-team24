import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import path from 'path';
import slugify from 'slugify';
import { getMongoUri } from '../mongodb-manager';
import User from '../../models/userModel.js';
import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';
import { hashPassword } from '../../helpers/authHelper.js';

const imagePath = path.resolve(process.cwd(), 'client/public/images/a1.png');

test.describe('Admin Product Management', () => {
  const testId = Date.now().toString().slice(-6);
  const adminEmail = `admin-test-${testId}@example.com`;
  const adminName = `Admin Test ${testId}`;
  const adminPassword = `AdminPass!${testId}`;
  const categoryName = `Admin Product Category ${testId}`;
  const categorySlug = `admin-product-category-${testId}`;
  const productName = `Admin Created Product ${testId}`;
  const updatedProductName = `Updated Product ${testId}`;
  const updatedProductSlug = slugify(updatedProductName, { lower: false });
  const initialDescription = 'Initial product description for admin create flow.';
  const updatedDescription = 'Updated product description after admin edit.';
  const initialPrice = '49';
  const updatedPrice = '79';
  const initialQuantity = '10';
  const updatedQuantity = '20';
  const initialShipping = 'Yes';
  const updatedShipping = 'No';
  let categoryId: string;
  let adminUserId: string;

  test.beforeAll(async () => {
    const mongoUri = getMongoUri();
    if (!mongoUri) throw new Error('MONGO_URI is not defined');

    await mongoose.connect(mongoUri);

    const category = await Category.findOneAndUpdate(
      { slug: categorySlug },
      { name: categoryName, slug: categorySlug },
      { upsert: true, new: true }
    );
    categoryId = category._id.toString();

    const hashedPassword = await hashPassword(adminPassword);
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      adminUserId = existingUser._id.toString();
      await User.findByIdAndUpdate(existingUser._id, {
        password: hashedPassword,
        role: 1,
      });
    } else {
      const user = await new User({
        name: `Admin Test ${testId}`,
        email: adminEmail,
        password: hashedPassword,
        phone: '1234567890',
        address: '123 Test Address',
        answer: 'Test',
        role: 1,
      }).save();
      adminUserId = user._id.toString();
    }

    await mongoose.disconnect();
  });

  test.afterAll(async () => {
    const mongoUri = getMongoUri();
    if (!mongoUri) return;
    await mongoose.connect(mongoUri);
    await Product.deleteMany({ slug: { $in: [
      `admin-created-product-${testId}`,
      updatedProductSlug,
    ] } });
    await Category.findOneAndDelete({ slug: categorySlug });
    await User.findByIdAndDelete(adminUserId);
    await mongoose.disconnect();
  });

  test('Create, update, and verify a product as admin', async ({ page }) => {
    // 1. Open a fresh browser session and navigate to the application home page.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();

    // 2. Navigate to the login page via the UI or directly to "/login".
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();

    // 3. Sign in using valid admin credentials.
    await page.getByPlaceholder(/enter your email/i).fill(adminEmail);
    await page.getByPlaceholder(/enter your password/i).fill(adminPassword);
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/$/);

    // 4. Open the admin dashboard by using the user dropdown and dashboard link.
    await page.locator('.nav-item.dropdown .dropdown-toggle').filter({ hasText: adminName }).click();
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page.getByRole('link', { name: /create product/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /products/i })).toBeVisible();

    // 5. From the admin menu, click Create Product.
    await page.getByRole('link', { name: /create product/i }).click();
    await expect(page.getByRole('heading', { name: /create product/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create product/i })).toBeVisible();

    // 6. Fill in the Create Product form with valid details.
    const categorySelect = page.locator('.ant-select-selector').nth(0);
    await categorySelect.click();
    await page.locator('.ant-select-item-option-content').filter({ hasText: categoryName }).click();

    await page.setInputFiles('input[type="file"]', imagePath);

    await page.getByPlaceholder(/write a name/i).fill(productName);
    await page.getByPlaceholder(/write a description/i).fill(initialDescription);
    await page.getByPlaceholder(/write a price/i).fill(initialPrice);
    await page.getByPlaceholder(/write a quantity/i).fill(initialQuantity);
    const shippingSelect = page.locator('.ant-select-selector').nth(1);
    await shippingSelect.click();
    await page.locator('.ant-select-item-option-content').filter({ hasText: /yes/i }).first().click();

    // 7. Submit the Create Product form.
    await page.getByRole('button', { name: /create product/i }).click();
    await expect(page).toHaveURL(/dashboard\/admin\/products/);
    await expect(page.getByRole('heading', { name: /all products list/i })).toBeVisible();

    // 8. On the admin products list, verify the new product appears.
    const createdCard = page.locator('.card').filter({
      has: page.getByRole('heading', { name: productName }),
    });
    await expect(createdCard).toBeVisible();

    // 9. Open the new product’s admin update page from the products list.
    await createdCard.click();
    await expect(page.getByRole('heading', { name: /update product/i })).toBeVisible();
    await expect(page.getByPlaceholder(/write a name/i)).toHaveValue(productName);

    // 10. Change product details.
    await page.getByPlaceholder(/write a name/i).fill(updatedProductName);
    await page.getByPlaceholder(/write a description/i).fill(updatedDescription);
    await page.getByPlaceholder(/write a price/i).fill(updatedPrice);
    await page.getByPlaceholder(/write a quantity/i).fill(updatedQuantity);
    const updateShippingSelect = page.locator('.ant-select-selector').nth(1);
    await updateShippingSelect.click();
    await page.locator('.ant-select-item-option-content').filter({ hasText: /no/i }).first().click();
    await page.setInputFiles('input[type="file"]', imagePath);

    // 11. Submit the Update Product form.
    await page.getByRole('button', { name: /update product/i }).click();
    await expect(page).toHaveURL(/dashboard\/admin\/products/);
    await expect(page.getByRole('heading', { name: /all products list/i })).toBeVisible();

    const updatedCard = page.locator('.card').filter({
      has: page.getByRole('heading', { name: updatedProductName }),
    });
    await expect(updatedCard).toBeVisible();

    // 12. Navigate to the public frontend catalog by going to the home page or category view.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();

    // 13. Locate the updated product in the frontend catalog.
    const publicCard = page.locator('.card').filter({
      has: page.getByRole('heading', { name: updatedProductName }),
    });
    await expect(publicCard).toBeVisible();
    await expect(publicCard).toContainText('$79.00');

    // 14. Open the product details page from the frontend catalog.
    await publicCard.getByRole('button', { name: /more details/i }).click();
    await expect(page).toHaveURL(new RegExp(`/product/${updatedProductSlug}`));
    await expect(page.getByText(new RegExp(`Name : ${updatedProductName}`))).toBeVisible();
    await expect(page.getByText(new RegExp(`Description : ${updatedDescription}`))).toBeVisible();
    await expect(page.getByText(/Price :/)).toContainText('$79.00');
  });
});