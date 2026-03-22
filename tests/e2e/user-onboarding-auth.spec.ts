import { test, expect } from '@playwright/test';

test.describe('E2E: User Onboarding Auth', () => {
  test('register shows required-field validation via checkValidity', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /register/i }).click();

    const requiredFields = [
      page.getByPlaceholder('Enter Your Name'),
      page.getByPlaceholder('Enter Your Email '),
      page.getByPlaceholder('Enter Your Password'),
      page.getByPlaceholder('Enter Your Phone'),
      page.getByPlaceholder('Enter Your Address'),
      page.locator('input[type="Date"]'),
      page.getByPlaceholder('What is Your Favorite sports'),
    ];

    for (const field of requiredFields) {
      const isValid = await field.evaluate((el) =>
        (el as HTMLInputElement).checkValidity()
      );
      expect(isValid).toBe(false);
    }
  });

  test('login shows required-field validation via checkValidity', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /login/i }).click();

    const requiredFields = [
      page.getByPlaceholder('Enter Your Email '),
      page.getByPlaceholder('Enter Your Password'),
    ];

    for (const field of requiredFields) {
      const isValid = await field.evaluate((el) =>
        (el as HTMLInputElement).checkValidity()
      );
      expect(isValid).toBe(false);
    }
  });

  test('register then login updates auth state', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `Onboarding User ${timestamp}`,
      email: `onboarding-${timestamp}@example.com`,
        password: 'Password123!',
      phone: '1234567890',
      address: '123 Test Lane',
      dob: '1990-01-01',
      answer: 'Cricket',
    };

    await page.goto('/register');
    await page.getByPlaceholder('Enter Your Name').fill(testUser.name);
    await page.getByPlaceholder('Enter Your Email ').fill(testUser.email);
    await page.getByPlaceholder('Enter Your Password').fill(testUser.password);
    await page.getByPlaceholder('Enter Your Phone').fill(testUser.phone);
    await page.getByPlaceholder('Enter Your Address').fill(testUser.address);
    await page.locator('input[type="Date"]').fill(testUser.dob);
    await page
      .getByPlaceholder('What is Your Favorite sports')
      .fill(testUser.answer);
    await page.getByRole('button', { name: /register/i }).click();

    await expect(page).toHaveURL(/\/login$/);

    await page.getByPlaceholder('Enter Your Email ').fill(testUser.email);
    await page.getByPlaceholder('Enter Your Password').fill(testUser.password);
    await page.getByRole('button', { name: /login/i }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: testUser.name })).toBeVisible();

    const auth = await page.evaluate(() => {
      const raw = localStorage.getItem('auth');
      return raw ? JSON.parse(raw) : null;
    });

    expect(auth?.token).toBeTruthy();
    expect(auth?.user?.email).toBe(testUser.email);
  });
});
