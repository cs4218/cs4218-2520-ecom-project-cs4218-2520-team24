// Leroy Chiu, A0273083E

import { test, expect } from '@playwright/test';
import path from "path";

test.describe.configure({ mode: 'serial' });
test.describe('Admin: Product Inventory Management', () => {

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "a@a.com";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "password";

    async function loginAs(page, email, password) {
        await page.goto("/login");
        await page.getByPlaceholder("Enter Your Email").fill(email);
        await page.getByPlaceholder("Enter Your Password").fill(password);
        await page.getByRole("button", { name: "LOGIN" }).click();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    }

    async function createCategoryAndProduct(page, categoryName, productName) {
        // Create category
        await page.goto("/dashboard/admin/create-category");
        await page.getByPlaceholder("Enter new category").fill(categoryName);
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(page.locator('table').getByRole("cell", { name: categoryName })).toBeVisible();

        // Create product
        await page.goto("/dashboard/admin/create-product");
        await page.locator(".ant-select-selector").first().click();
        await page.getByTitle(categoryName).click();
        await page.setInputFiles('input[type="file"]', path.join(process.cwd(), "client/public/images/a1.png"));
        await page.getByPlaceholder("write a name").fill(productName);
        await page.getByPlaceholder("write a description").fill("A test product description");
        await page.getByPlaceholder("write a Price").fill("50");
        await page.getByPlaceholder("write a quantity").fill("10");
        await page.locator(".ant-select-selector").nth(1).click();
        await page.getByTitle("Yes").click();
        await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
        await expect(page).toHaveURL(/\/admin\/products/, { timeout: 10_000 });
    }

    test.beforeEach(async ({ page }) => {
        await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    });

    test("admin can search for a product in the admin products list", async ({ page }) => {
        const categoryName = `cat_${Date.now()}`;
        const productName = `prod_${Date.now()}`;

        await createCategoryAndProduct(page, categoryName, productName);

        // Navigate to products list
        await page.goto("/dashboard/admin/products");

        // Use the site search to find the product
        await page.getByRole("searchbox").fill(productName);
        await page.getByRole("button", { name: "Search" }).click();

        // Verify product appears in search results
        await expect(page.getByText(productName).first()).toBeVisible();
    });

    test("admin can update a product's details", async ({ page }) => {
        const categoryName = `cat_${Date.now()}`;
        const productName = `prod_${Date.now()}`;
        const updatedName = `updated_${Date.now()}`;

        await createCategoryAndProduct(page, categoryName, productName);

        // Navigate to products list and click Update on the product
        await page.goto("/dashboard/admin/products");
        await page.getByRole("link", { name: new RegExp(productName) }).first().click();
        await expect(page).toHaveURL(/\/dashboard\/admin\/product\//, { timeout: 10_000 });

        // Update the product name and price
        await page.getByPlaceholder("write a name").clear();
        await page.getByPlaceholder("write a name").fill(updatedName);
        await page.getByPlaceholder("write a Price").clear();
        await page.getByPlaceholder("write a Price").fill("99");

        await page.getByRole("button", { name: /update product/i }).click();
        await expect(page).toHaveURL(/\/dashboard\/admin\/products/, { timeout: 10_000 });

        // Verify updated product appears in the list
        await expect(page.getByText(updatedName).first()).toBeVisible();
    });

    test("admin can delete a product", async ({ page }) => {
        const categoryName = `cat_${Date.now()}`;
        const productName = `prod_${Date.now()}`;

        await createCategoryAndProduct(page, categoryName, productName);

        // Navigate to products list
        await page.goto("/dashboard/admin/products");
        await expect(page.getByText(productName).first()).toBeVisible();

        // Click into the product update page
        await page.getByRole("link", { name: new RegExp(productName) }).first().click();
        await expect(page).toHaveURL(/\/dashboard\/admin\/product\//, { timeout: 10_000 });

        // Click delete and confirm the browser dialog
        page.once('dialog', dialog => dialog.accept('yes'));
        await page.getByRole("button", { name: /delete product/i }).click();

        // Verify redirect back to products list and product is gone
        await expect(page).toHaveURL(/\/dashboard\/admin\/products/, { timeout: 10_000 });
        await expect(page.getByText(productName)).not.toBeVisible();
    });

});