# Product Page Metadata Test Plan

## Application Overview

Verify product details page has correct meta tags and product image for SEO and preview purposes.

## Test Scenarios

### 1. Product Details Metadata

**Seed:** `seed.spec.ts`

#### 1.1. Verify product details page metadata and image

**File:** `tests/e2e/product-meta.spec.ts`

**Steps:**
  1. Navigate to the product details page for the seeded product (smartphone).
    - expect: The URL should end with "/product/smartphone".
    - expect: The page heading "Product Details" should be visible.
  2. Inspect the document head metadata.
    - expect: The page title should be "Ecommerce app - shop now".
    - expect: Meta description should be "mern stack project".
    - expect: Meta keywords should be "mern,react,node,mongodb".
    - expect: Meta author should be "Techinfoyt".
    - expect: A meta tag with charset "utf-8" should exist.
  3. Inspect the product image element.
    - expect: An image with alt text "Smartphone" should be visible.
    - expect: The product image src should include "/api/v1/product/product-photo/" and be non-empty.
