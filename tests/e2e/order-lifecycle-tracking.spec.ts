// Carsten Joe Ng, A0255763W

import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import { getMongoUri } from '../mongodb-manager';
import User from '../../models/userModel.js';
import Product from '../../models/productModel.js';
import Category from '../../models/categoryModel.js';
import Order from '../../models/orderModel.js';
import { hashPassword } from '../../helpers/authHelper.js';

test.describe('E2E: Order Lifecycle & Tracking', () => {
  const testId = Date.now().toString().slice(-6);

  // Test user account (regular user)
  const testUser = {
    name: `User ${testId}`,
    email: `ordertrack_user_${testId}@example.com`,
    password: 'userPassword123',
    phone: '9876543210',
    address: '456 Order Lane',
    answer: 'test',
    role: 0, // Regular user
  };

  // Admin account
  const adminUser = {
    name: `Admin ${testId}`,
    email: `ordertrack_admin_${testId}@example.com`,
    password: 'adminPassword123',
    phone: '1234567890',
    address: '123 Admin Street',
    answer: 'test',
    role: 1, // Admin role
  };

  // Test product
  const testProduct: any = {
    name: `Tracking Item ${testId}`,
    slug: `tracking-item-${testId}`,
    description: 'Test product for order tracking',
    price: 49.99,
    quantity: 20,
    shipping: true,
  };

  let userId: any;
  let adminId: any;
  let orderId: any;
  let categoryId: any;

  test.beforeAll(async () => {
    // 1. Establish DB Connection
    const mongoUri = getMongoUri();
    if (!mongoUri) throw new Error('Test Worker could not find MONGO_URL.');
    await mongoose.connect(mongoUri);

    // 2. Create and seed test category
    const category = await new Category({
      name: `Order Tracking Category ${testId}`,
      slug: `order-cat-${testId}`,
    }).save();
    categoryId = category._id;

    // 3. Seed test product with the category
    testProduct.category = categoryId;
    await new Product(testProduct).save();

    // 4. Create regular user
    const hashedUserPassword = await hashPassword(testUser.password);
    const user = await User.findOneAndUpdate(
      { email: testUser.email },
      { ...testUser, password: hashedUserPassword },
      { upsert: true, new: true }
    );
    userId = user._id;

    // 5. Create admin user
    const hashedAdminPassword = await hashPassword(adminUser.password);
    const admin = await User.findOneAndUpdate(
      { email: adminUser.email },
      { ...adminUser, password: hashedAdminPassword },
      { upsert: true, new: true }
    );
    adminId = admin._id;

    // 6. Create an order for the regular user
    // Status starts as "Not Processing"
    const product = await Product.findOne({ slug: testProduct.slug });
    const order = await new Order({
      products: [product._id],
      buyer: userId,
      payment: { success: true, amount: testProduct.price },
      status: 'Not Processing', // Initial status
    }).save();
    orderId = order._id;

    console.log(`✓ Test setup complete: User ${userId}, Admin ${adminId}, Order ${orderId}`);
  });

  test('Admin updates order status to Shipped, User sees update on orders page', async ({ page, context }) => {
    // ========================================
    // STEP 1: Admin logs in and navigates to admin orders page
    // ========================================
    await page.goto('/login');

    // Fill login form
    await page.fill('input[placeholder="Enter Your Email "]', adminUser.email);
    await page.fill('input[placeholder="Enter Your Password"]', adminUser.password);

    // Click LOGIN button
    await page.click('button:has-text("LOGIN")');

    // Wait for redirect to home page after successful login
    await page.waitForURL('/');
    await expect(page.locator('body')).toBeVisible(); // Verify page loaded

    // ========================================
    // STEP 2: Admin navigates to orders dashboard
    // ========================================
    await page.goto('/dashboard/admin/orders');
    await page.waitForLoadState('networkidle');

    // Verify admin orders page loaded
    await expect(page.locator('h1.text-center')).toContainText('All Orders');

    // ========================================
    // STEP 3: Find the order for the test user and update status to "Shipped"
    // ========================================
    // Find the order that belongs to testUser by looking for the buyer name
    // Each order row contains: #, Status (Select), Buyer Name, Date, Payment, Quantity
    const orderRows = page.locator('table tbody tr');
    
    let found = false;
    for (let i = 0; i < await orderRows.count(); i++) {
      const row = orderRows.nth(i);
      const rowText = await row.textContent();
      
      // Check if this row belongs to our test user (by buyer name)
      if (rowText?.includes(testUser.name) && rowText?.includes('Not Processing')) {
        found = true;
        
        // Get the Select component for this specific row
        const statusSelect = row.locator('.ant-select-selector').first();
        
        // Click to open the Ant Design Select dropdown
        await statusSelect.click();
        await page.waitForTimeout(500);

        // Find and click the "Shipped" option in the dropdown
        await page.locator('.ant-select-item-option:has-text("Shipped")').click();

        // Wait for the API call to complete (order status update)
        await page.waitForTimeout(1500);

        console.log(`✓ Admin updated order status to Shipped for user ${testUser.name}`);
      }
    }

    expect(found).toBe(true);

    // ========================================
    // STEP 4: Verify the status change is reflected in the admin view
    // ========================================
    await page.waitForLoadState('networkidle');

    const selectSelectors2 = page.locator('.ant-select-selector');
    let verified = false;
    for (let i = 0; i < await selectSelectors2.count(); i++) {
      const val = await selectSelectors2.nth(i).textContent();
      if (val?.includes('Shipped')) {
        verified = true;
        break;
      }
    }
    expect(verified).toBe(true);

    console.log('✓ Admin verified status updated to Shipped');

    // ========================================
    // STEP 5: Admin logs out
    // ========================================
    // Click on the logout link (usually in a dropdown or navbar)
    // Common location: top right, or in a menu

    // Wait for page to settle
    await page.waitForTimeout(1000);

    // Locate and click logout button
    const logoutBtn = page.locator('a:has-text("Logout"), button:has-text("Logout")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL('/login');
      console.log('✓ Admin logged out');
    } else {
      console.log('⚠ Logout button not found, attempting localStorage clear');
      // Fallback: clear localStorage and navigate
      await page.evaluate(() => {
        localStorage.removeItem('auth');
      });
      await page.goto('/login');
    }

    // ========================================
    // STEP 6: Regular user logs in
    // ========================================

    await page.fill('input[placeholder="Enter Your Email "]', testUser.email);
    await page.fill('input[placeholder="Enter Your Password"]', testUser.password);
    await page.click('button:has-text("LOGIN")');

    // Wait for redirect after login
    await page.waitForURL('/');
    console.log('✓ User logged in');

    // ========================================
    // STEP 7: User navigates to their orders page
    // ========================================
    await page.goto('/dashboard/user/orders');
    await page.waitForLoadState('networkidle');

    // Verify user orders page loaded
    await expect(page.locator('h1.text-center')).toContainText('All Orders');
    console.log('✓ User navigated to orders page');

    // ========================================
    // STEP 8: User verifies the order status is now "Shipped"
    // ========================================
    // The order table displays order status in the second column
    const orderStatusCell = page.locator('table tbody tr td').nth(1);

    // Wait for the status to be visible and check its content
    await expect(orderStatusCell).toBeVisible();

    const statusText = await orderStatusCell.textContent();
    expect(statusText?.trim()).toBe('Shipped');

    console.log('✓ User verified order status is Shipped');

    // ========================================
    // STEP 9: Verify other order details are intact
    // ========================================
    const orderRow = page.locator('table tbody tr');

    // Column 3: Buyer name
    const buyerCell = orderRow.locator('td').nth(2);
    const buyerText = await buyerCell.textContent();
    expect(buyerText?.trim()).toBe(testUser.name);

    // Column 5: Payment status
    const paymentCell = orderRow.locator('td').nth(4);
    const paymentText = await paymentCell.textContent();
    expect(paymentText?.trim()).toBe('Success');

    // Column 6: Quantity (number of products)
    const quantityCell = orderRow.locator('td').nth(5);
    const quantityText = await quantityCell.textContent();
    expect(quantityText?.trim()).toBe('1'); // We added 1 product

    console.log('✓ All order details verified');

    // ========================================
    // STEP 10: Verify product details are displayed
    // ========================================
    const productName = page.locator('text=' + testProduct.name);
    await expect(productName).toBeVisible();

    const productPrice = page.locator('text=Price : ' + testProduct.price);
    await expect(productPrice).toBeVisible();

    console.log('✓ Product details visible on order');
  });
});
