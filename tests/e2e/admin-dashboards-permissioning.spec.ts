// Carsten Joe Ng, A0255763W

import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import { getMongoUri } from '../mongodb-manager';
import User from '../../models/userModel.js';
import { hashPassword } from '../../helpers/authHelper.js';

test.describe('E2E: Admin Dashboards & Permissioning', () => {
  const testId = Date.now().toString().slice(-6);

  // Regular user account
  const regularUser = {
    name: `Regular User ${testId}`,
    email: `admin_perm_user_${testId}@example.com`,
    password: 'userPassword123',
    phone: '5555555555',
    address: '999 Regular Lane',
    answer: 'test',
    role: 0, // Regular user
  };

  // Admin user account
  const adminUser = {
    name: `Admin User ${testId}`,
    email: `admin_perm_admin_${testId}@example.com`,
    password: 'adminPassword123',
    phone: '1111111111',
    address: '888 Admin Street',
    answer: 'test',
    role: 1, // Admin role
  };

  let regularUserId: any;
  let adminUserId: any;

  test.beforeAll(async () => {
    // 1. Establish DB Connection
    const mongoUri = getMongoUri();
    if (!mongoUri) throw new Error('Test Worker could not find MONGO_URL.');
    await mongoose.connect(mongoUri);

    // 2. Create regular user
    const hashedUserPassword = await hashPassword(regularUser.password);
    const user = await User.findOneAndUpdate(
      { email: regularUser.email },
      { ...regularUser, password: hashedUserPassword },
      { upsert: true, new: true }
    );
    regularUserId = user._id;

    // 3. Create admin user
    const hashedAdminPassword = await hashPassword(adminUser.password);
    const admin = await User.findOneAndUpdate(
      { email: adminUser.email },
      { ...adminUser, password: hashedAdminPassword },
      { upsert: true, new: true }
    );
    adminUserId = admin._id;

    console.log(`✓ Test setup complete: Regular User ${regularUserId}, Admin ${adminUserId}`);
  });

  test('Admin can access /dashboard/admin and see admin menu links', async ({ page }) => {
    // ========================================
    // STEP 1: Login as Admin
    // ========================================
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Wait for login form
    await expect(page.locator('input[placeholder="Enter Your Email "]')).toBeVisible();

    // Fill login form with admin credentials
    await page.fill('input[placeholder="Enter Your Email "]', adminUser.email);
    await page.fill('input[placeholder="Enter Your Password"]', adminUser.password);
    
    // Click LOGIN button
    await page.click('button:has-text("LOGIN")');

    // Wait for redirect to home page
    await page.waitForURL('/');
    console.log('✓ Admin logged in successfully');

    // ========================================
    // STEP 2: Navigate to /dashboard/admin
    // ========================================
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    // Verify the page loaded - check for admin-specific content
    await expect(page.locator('h3:has-text("Admin Name")')).toBeVisible();
    console.log('✓ Admin can access /dashboard/admin');

    // ========================================
    // STEP 3: Verify Admin Menu Links are Visible
    // ========================================
    // Check for admin menu title
    await expect(page.locator('h4:has-text("Admin Panel")')).toBeVisible();

    // Verify specific admin menu links
    const expectedLinks = [
      'Create Category',
      'Create Product',
      'Products',
      'Orders',
    ];

    for (const linkText of expectedLinks) {
      const link = page.locator(`a.list-group-item:has-text("${linkText}")`);
      await expect(link).toBeVisible();
      console.log(`✓ Admin menu link visible: ${linkText}`);
    }

    // ========================================
    // STEP 4: Verify links are functional
    // ========================================
    // Click on "Create Category" link
    await page.locator('a.list-group-item:has-text("Create Category")').click();
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the create category page by checking for the page header
    await expect(page.locator('h1, h2').filter({ hasText: /Create Category|Manage Category/i })).toBeVisible();
    console.log('✓ Create Category link works');

    // Navigate back to admin dashboard
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    // Click on "Create Product" link
    await page.locator('a.list-group-item:has-text("Create Product")').click();
    await page.waitForLoadState('networkidle');

    // Verify we're on the create product page by checking for the page header
    await expect(page.locator('h1, h2').filter({ hasText: /Create Product|Manage Product/i })).toBeVisible();
    console.log('✓ Create Product link works');

    // Navigate back to admin dashboard
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    // Click on "Orders" link
    await page.locator('a.list-group-item:has-text("Orders")').click();
    await page.waitForLoadState('networkidle');

    // Verify we're on the orders page by checking for the page header
    await expect(page.locator('h1, h2').filter({ hasText: /All Orders|Orders/i })).toBeVisible();
    console.log('✓ Orders link works');
  });

  test('Admin can access /dashboard/admin/users page', async ({ page }) => {
    // ========================================
    // STEP 1: Login as Admin
    // ========================================
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[placeholder="Enter Your Email "]')).toBeVisible();

    await page.fill('input[placeholder="Enter Your Email "]', adminUser.email);
    await page.fill('input[placeholder="Enter Your Password"]', adminUser.password);
    await page.click('button:has-text("LOGIN")');
    await page.waitForURL('/');

    console.log('✓ Admin logged in');

    // ========================================
    // STEP 2: Navigate directly to /dashboard/admin/users
    // ========================================
    await page.goto('/dashboard/admin/users');
    await page.waitForLoadState('networkidle');

    // Verify the page loaded
    await expect(page.locator('body')).toContainText('User', { timeout: 5000 });
    console.log('✓ Admin can access /dashboard/admin/users');

    // ========================================
    // STEP 3: Verify users are displayed
    // ========================================
    // Check for user list or table
    const userElements = page.locator('table, .user-list, .ant-table');
    const count = await userElements.count();
    
    if (count > 0) {
      await expect(userElements.first()).toBeVisible();
      console.log('✓ Users list/table is visible');
    }
  });

  test('Regular user is blocked from accessing /dashboard/admin', async ({ page }) => {
    // ========================================
    // STEP 1: Login as Regular User
    // ========================================
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[placeholder="Enter Your Email "]')).toBeVisible();

    // Fill login form with regular user credentials
    await page.fill('input[placeholder="Enter Your Email "]', regularUser.email);
    await page.fill('input[placeholder="Enter Your Password"]', regularUser.password);
    await page.click('button:has-text("LOGIN")');
    await page.waitForURL('/');

    console.log('✓ Regular user logged in');

    // ========================================
    // STEP 2: Attempt to navigate to /dashboard/admin
    // ========================================
    await page.goto('/dashboard/admin');
    
    // The AdminRoute component shows a Spinner when the user is not an admin
    // Wait for either:
    // 1. Spinner to appear (showing they're being blocked)
    // 2. Redirect to another page
    // 3. Or timeout showing access was denied
    
    const spinnerExists = await page.locator('.spinner, [aria-label="loading"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (spinnerExists) {
      console.log('✓ Regular user shown spinner (access blocked)');
    }

    // Verify the user is NOT on the admin dashboard
    const dashboardExists = await page.locator('h3:has-text("Admin Name")').isVisible({ timeout: 2000 }).catch(() => false);
    expect(dashboardExists).toBe(false);
    console.log('✓ Regular user cannot access admin dashboard');

    // ========================================
    // STEP 3: Attempt to navigate to /dashboard/admin/users
    // ========================================
    await page.goto('/dashboard/admin/users');
    
    const spinnerExists2 = await page.locator('.spinner, [aria-label="loading"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (spinnerExists2) {
      console.log('✓ Regular user shown spinner on users page (access blocked)');
    }

    // Verify the user is NOT on the users page
    const usersPageExists = await page.locator('table, .user-list').isVisible({ timeout: 2000 }).catch(() => false);
    expect(usersPageExists).toBe(false);
    console.log('✓ Regular user cannot access users page');
  });

  test('Regular user cannot access admin menu links from user dashboard', async ({ page }) => {
    // ========================================
    // STEP 1: Login as Regular User
    // ========================================
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[placeholder="Enter Your Email "]')).toBeVisible();

    await page.fill('input[placeholder="Enter Your Email "]', regularUser.email);
    await page.fill('input[placeholder="Enter Your Password"]', regularUser.password);
    await page.click('button:has-text("LOGIN")');
    await page.waitForURL('/');

    console.log('✓ Regular user logged in');

    // ========================================
    // STEP 2: Navigate to user dashboard
    // ========================================
    await page.goto('/dashboard/user');
    await page.waitForLoadState('networkidle');

    // Verify we're on the user dashboard
    await expect(page.locator('.dashboard')).toBeVisible({ timeout: 3000 });
    console.log('✓ Regular user on dashboard');

    // ========================================
    // STEP 3: Verify Admin Menu is NOT visible
    // ========================================
    const adminMenuExists = await page.locator('h4:has-text("Admin Panel")').isVisible({ timeout: 2000 }).catch(() => false);
    expect(adminMenuExists).toBe(false);
    console.log('✓ Admin menu not shown to regular user');

    // Verify User Menu IS visible instead
    const userMenuExists = await page.locator('h4:has-text("Dashboard")').isVisible({ timeout: 2000 }).catch(() => false);
    expect(userMenuExists).toBe(true);
    console.log('✓ User menu shown to regular user');
  });

  test('Admin sees Admin Menu but not User Menu on admin dashboard', async ({ page }) => {
    // ========================================
    // STEP 1: Login as Admin
    // ========================================
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[placeholder="Enter Your Email "]')).toBeVisible();

    await page.fill('input[placeholder="Enter Your Email "]', adminUser.email);
    await page.fill('input[placeholder="Enter Your Password"]', adminUser.password);
    await page.click('button:has-text("LOGIN")');
    await page.waitForURL('/');

    console.log('✓ Admin logged in');

    // ========================================
    // STEP 2: Navigate to admin dashboard
    // ========================================
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    // Verify we're on the admin dashboard
    await expect(page.locator('h3:has-text("Admin Name")')).toBeVisible();
    console.log('✓ Admin on dashboard');

    // ========================================
    // STEP 3: Verify Admin Menu IS visible
    // ========================================
    const adminMenuExists = await page.locator('h4:has-text("Admin Panel")').isVisible();
    expect(adminMenuExists).toBe(true);
    console.log('✓ Admin menu shown to admin');

    // ========================================
    // STEP 4: Verify User Menu is NOT visible
    // ========================================
    const userMenuExists = await page.locator('h4:has-text("User Menu")').isVisible({ timeout: 2000 }).catch(() => false);
    expect(userMenuExists).toBe(false);
    console.log('✓ User menu not shown to admin');
  });
});
