// Leroy Chiu, A0273083E
import { test, expect } from '@playwright/test';

test.describe('Contact Page', () => {
    test('should render contact page correctly', async ({ page }) => {
        await page.goto('/contact');

        // Check main heading
        await expect(page.getByText('CONTACT US')).toBeVisible();

        // Check static content
        await expect(page.getByText(/help@ecommerceapp.com/i)).toBeVisible();
        await expect(page.getByText(/012-3456789/)).toBeVisible();
        await expect(page.getByText(/toll free/i)).toBeVisible();
    });

    test('Contact page renders the contact image', async ({ page }) => {
        await page.goto('/contact');

        const contactImg = page.locator('img[alt="contactus"]');
        await expect(contactImg).toBeVisible();
    });
});
