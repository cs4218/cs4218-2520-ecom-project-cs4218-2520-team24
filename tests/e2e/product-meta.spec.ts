import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';

dotenv.config();

test.describe('Product details page metadata', () => {
  test('should render correct meta tags and product image for the seeded product', async ({ page }) => {
    // 1. Navigate to the product details page for the seeded product (smartphone).
    await page.goto('/product/smartphone');
    await expect(page).toHaveURL(/\/product\/smartphone$/);
    await expect(page.getByRole('heading', { name: 'Product Details' })).toBeVisible();

    // 2. Inspect the document head metadata.
    await expect(page).toHaveTitle('Ecommerce app - shop now');

    await expect(page.locator('meta[data-react-helmet="true"][name="description"]')).toHaveAttribute('content', 'mern stack project');
    await expect(page.locator('meta[data-react-helmet="true"][name="keywords"]')).toHaveAttribute('content', 'mern,react,node,mongodb');
    await expect(page.locator('meta[data-react-helmet="true"][name="author"]')).toHaveAttribute('content', 'Techinfoyt');
    await expect(page.locator('meta[data-react-helmet="true"][charset="utf-8"]')).toHaveCount(1);

    // 3. Inspect the product image element.
    // Use a more resilient locator that handles the alt text variations
    const productImage = page.locator('img[alt="Smartphone"], img[alt="Product"]').first();
    await expect(productImage).toBeVisible();
    
    const src = await productImage.getAttribute('src');
    expect(src).toBeTruthy();
    // It should either be the product photo API or the placeholder I added
    expect(src).toMatch(/\/api\/v1\/product\/product-photo\/|\/api\/placeholder\//);
  });
});
