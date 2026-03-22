// Nam Dohyun
import { test, expect } from '@playwright/test';

test.describe('Reset Password E2E', () => {
  const testUser = {
    name: 'Reset Test User',
    email: `reset-test-${Date.now()}@example.com`,
    password: 'old-password123',
    newPassword: 'new-password456',
    phone: '1234567890',
    address: '123 Reset St',
    dob: '1990-01-01',
    answer: 'Cricket'
  };

  test('should register a user and then reset their password', async ({ page }) => {
    // 1. Register a new user
    await page.goto('/register');
    await page.getByPlaceholder(/enter your name/i).fill(testUser.name);
    await page.getByPlaceholder(/enter your email/i).fill(testUser.email);
    await page.getByPlaceholder(/enter your password/i).fill(testUser.password);
    await page.getByPlaceholder(/enter your phone/i).fill(testUser.phone);
    await page.getByPlaceholder(/enter your address/i).fill(testUser.address);
    // Fill DOB
    await page.locator('input[type="Date"]').fill(testUser.dob);
    // Fill security answer
    await page.getByPlaceholder(/what is your favorite sports/i).fill(testUser.answer);
    
    await page.getByRole('button', { name: /register/i }).click();

    // Verify redirection to login after registration
    await expect(page).toHaveURL(/\/login$/);

    // 2. Navigate to Forgot Password
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    // 3. Perform Password Reset
    await page.getByPlaceholder(/enter your email/i).fill(testUser.email);
    await page.getByPlaceholder(/enter your favorite sport name/i).fill(testUser.answer);
    await page.getByPlaceholder(/enter your new password/i).fill(testUser.newPassword);
    
    await page.getByRole('button', { name: /reset/i }).click();

    // 4. Verify Success & Relogin
    await expect(page).toHaveURL(/\/login$/);
    
    // Attempt login with the NEW password
    await page.getByPlaceholder(/enter your email/i).fill(testUser.email);
    await page.getByPlaceholder(/enter your password/i).fill(testUser.newPassword);
    await page.getByRole('button', { name: /login/i }).click();

    // Verify successful login (should be on home page or dashboard)
    await expect(page).toHaveURL(/\/$/);
    
    // To logout, we first need to open the user dropdown
    await page.getByRole('button', { name: testUser.name }).click();
    await expect(page.getByRole('link', { name: /logout/i })).toBeVisible();
    await page.getByRole('link', { name: /logout/i }).click();
    
    // Verify we are logged out (back to login or showing Login link)
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });
});
