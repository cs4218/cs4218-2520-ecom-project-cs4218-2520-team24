# Admin Product Management Flow

## Application Overview

Validates the admin product creation and management lifecycle: admin login, dashboard navigation, product creation, product update, and verification in the public frontend catalog.

## Test Scenarios

### 1. Admin Product Management

**Seed:** `tests/global-setup.ts`

#### 1.1. Create, update, and verify a product as admin

**File:** `tests/e2e/admin-product-management.spec.ts`

**Steps:**
  1. Open a fresh browser session and navigate to the application home page.
    - expect: Application loads successfully and the home page is visible.
  2. Navigate to the login page via the UI or directly to "/login".
    - expect: Login form is visible with email and password fields.
  3. Sign in using valid admin credentials.
    - expect: Login succeeds.
    - expect: User is redirected to the home page or dashboard.
    - expect: The authenticated user has admin privileges.
  4. Open the admin dashboard by navigating to "/dashboard/admin" or using the admin menu.
    - expect: Admin Dashboard page is visible.
    - expect: Admin menu links include Create Product and Products.
  5. From the admin menu, click Create Product.
    - expect: Create Product page is displayed.
    - expect: The form contains fields for category, photo upload, name, description, price, quantity, shipping, and a Create Product button.
  6. Fill in the Create Product form with valid details: name, description, price, category, quantity, shipping, and upload a photo.
    - expect: All required fields are populated.
    - expect: A photo preview displays after image upload if supported.
  7. Submit the Create Product form.
    - expect: Success message is shown that the product was created.
    - expect: The page navigates to the admin products list.
  8. On the admin products list, verify the new product appears.
    - expect: The product card appears in the products list with the correct name.
    - expect: The product card links to the update page for that product.
  9. Open the new product’s admin update page from the products list.
    - expect: Update Product page loads.
    - expect: Existing product details are pre-filled in the form.
  10. Change product details such as name, description, price, quantity, and shipping status.
    - expect: Form fields contain the updated values.
  11. Submit the Update Product form.
    - expect: Success message confirms the product was updated.
    - expect: Redirect returns to the admin products list.
  12. Navigate to the public frontend catalog by going to the home page or category view.
    - expect: Frontend product catalog is displayed with product cards.
  13. Locate the updated product in the frontend catalog or via category filtering.
    - expect: The updated product appears in the frontend catalog.
    - expect: Displayed details match the updated name and price.
  14. Open the product details page from the frontend catalog.
    - expect: Product detail page loads.
    - expect: The updated product name, description, price, and shipping info are visible.
