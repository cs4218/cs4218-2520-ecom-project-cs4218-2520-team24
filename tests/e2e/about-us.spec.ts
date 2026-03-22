import { test, expect } from '@playwright/test';

test.describe('About Us Page', () => {
  test('should navigate to About Us and display core company info', async ({ page }) => {
    // 1. Use relative paths (assumes baseURL is set in config)
    await page.goto('/');

    // 2. Locate by Role - much more resilient than CSS classes
    const footer = page.getByRole('contentinfo'); 
    const aboutLink = footer.getByRole('link', { name: 'About' });
    
    await aboutLink.click();

    // 3. Verify navigation using a regex to ignore trailing slashes or full domains
    await expect(page).toHaveURL(/\/about$/);

    // 4. Verify the Heading instead of just the Title tag
    // Users see <h1> tags, not just the browser tab title
    await expect(page.getByRole('heading', { name: /about us/i })).toBeVisible();

    // 5. Verify the image by its functional presence
    await expect(page.getByRole('img', { name: 'contactus' })).toBeVisible();

    // 7. Verify Footer links exist (checking visibility is often better than just attributes)
    await expect(footer.getByRole('link', { name: 'Contact' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  });
});