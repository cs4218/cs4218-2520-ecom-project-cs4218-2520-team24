import { test, expect } from '@playwright/test';

test.describe('E2E: Profile management and forgot password', () => {
  test('updates profile details and persists after reload', async ({ page }) => {
    const timestamp = Date.now();
    const user = {
      name: `Profile User ${timestamp}`,
      email: `profile-${timestamp}@example.com`,
      password: 'Password123!',
      phone: '1234567890',
      address: '123 Test Lane',
      dob: '1990-01-01',
      answer: 'Cricket',
    };

    await page.goto('/register');
    await page.getByPlaceholder('Enter Your Name').fill(user.name);
    await page.getByPlaceholder('Enter Your Email ').fill(user.email);
    await page.getByPlaceholder('Enter Your Password').fill(user.password);
    await page.getByPlaceholder('Enter Your Phone').fill(user.phone);
    await page.getByPlaceholder('Enter Your Address').fill(user.address);
    await page.locator('input[type="Date"]').fill(user.dob);
    await page.getByPlaceholder('What is Your Favorite sports').fill(user.answer);
    await page.getByRole('button', { name: /register/i }).click();

    await expect(page).toHaveURL(/\/login$/);

    await page.getByPlaceholder('Enter Your Email ').fill(user.email);
    await page.getByPlaceholder('Enter Your Password').fill(user.password);
    await page.getByRole('button', { name: /login/i }).click();

    await expect(page).toHaveURL(/\/$/);

    await page.goto('/dashboard/user/profile');

    const updatedName = `Updated ${user.name}`;
    const updatedPhone = '9876543210';
    const updatedAddress = '456 Updated Lane';

    await page.getByPlaceholder('Enter Your Name').fill(updatedName);
    await page.getByPlaceholder('Enter Your Phone').fill(updatedPhone);
    await page.getByPlaceholder('Enter Your Address').fill(updatedAddress);
    await page.getByRole('button', { name: /update/i }).click();

    await page.reload();

    await expect(page.getByPlaceholder('Enter Your Name')).toHaveValue(updatedName);
    await expect(page.getByPlaceholder('Enter Your Phone')).toHaveValue(updatedPhone);
    await expect(page.getByPlaceholder('Enter Your Address')).toHaveValue(updatedAddress);
  });

  test('forgot password flow from login page', async ({ page }) => {
    const timestamp = Date.now();
    const user = {
      name: `Forgot User ${timestamp}`,
      email: `forgot-${timestamp}@example.com`,
      password: 'Password123!',
      newPassword: 'NewPassword456!',
      phone: '1234567890',
      address: '123 Reset Lane',
      dob: '1990-01-01',
      answer: 'Cricket',
    };

    await page.goto('/register');
    await page.getByPlaceholder('Enter Your Name').fill(user.name);
    await page.getByPlaceholder('Enter Your Email ').fill(user.email);
    await page.getByPlaceholder('Enter Your Password').fill(user.password);
    await page.getByPlaceholder('Enter Your Phone').fill(user.phone);
    await page.getByPlaceholder('Enter Your Address').fill(user.address);
    await page.locator('input[type="Date"]').fill(user.dob);
    await page.getByPlaceholder('What is Your Favorite sports').fill(user.answer);
    await page.getByRole('button', { name: /register/i }).click();

    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    await page.getByPlaceholder('Enter Your Email').fill(user.email);
    await page.getByPlaceholder('Enter Your Favorite Sport Name').fill(user.answer);
    await page.getByPlaceholder('Enter Your New Password').fill(user.newPassword);
    await page.getByRole('button', { name: /reset/i }).click();

    await expect(page).toHaveURL(/\/login$/);

    await page.getByPlaceholder('Enter Your Email ').fill(user.email);
    await page.getByPlaceholder('Enter Your Password').fill(user.newPassword);
    await page.getByRole('button', { name: /login/i }).click();

    await expect(page).toHaveURL(/\/$/);
  });
});
