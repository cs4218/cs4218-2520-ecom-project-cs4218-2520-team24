// Leroy Chiu, A0273083E

import { test, expect } from '@playwright/test';
import path from "path";

test.describe('Admin: Create Category → Product Flow', () => {

    let categories = [{ _id: '1', name: 'Electronics' }];

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "a@a.com";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "password";

    async function loginAs(page, email, password) {
        await page.goto("/login");
        await page.getByPlaceholder("Enter Your Email").fill(email);
        await page.getByPlaceholder("Enter Your Password").fill(password);
        await page.getByRole("button", { name: "LOGIN" }).click();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    }

    test("created category appears on the public categories page", async ({page}) => {
        const categoryName = `books_${Date.now()}`;

        await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

        await page.goto("/dashboard/admin/create-category");
        await page.getByPlaceholder("Enter new category").fill(categoryName);
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();

        await page.goto("/categories");
        await expect(page.getByRole("link", { name: categoryName })).toBeVisible();
    });

    test("created product appears on the public product listing page", async ({page}) => {
        const categoryName = `books_${Date.now()}`;
        const productName = `coding101_${Date.now()}`;

        await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
        await page.goto("/dashboard/admin/create-category");
        await page.getByPlaceholder("Enter new category").fill(categoryName);
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();

        await page.goto("/dashboard/admin/create-product");
        await page.locator(".ant-select-selector").first().click();
        await page.getByTitle(categoryName).click();
        await page.setInputFiles('input[type="file"]', path.join(process.cwd(), "client/public/images/a1.png"));
        await page.getByPlaceholder("write a name").fill(productName);
        await page.getByPlaceholder("write a description").fill("A book that looks like a clock");
        await page.getByPlaceholder("write a Price").fill("80");
        await page.getByPlaceholder("write a quantity").fill("15");
        await page.locator(".ant-select-selector").nth(1).click();
        await page.getByTitle("Yes").click();
        await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
        await expect(page).toHaveURL(/\/admin\/products/, { timeout: 10_000 });

        await page.goto("/");
        await expect(page.getByText(productName)).toBeVisible();
    });

});