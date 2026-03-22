# Navigation and Search Flow

## Application Overview

Validates the core browsing experience across Home, Categories, Category detail, Product detail, and Search pages. Ensures users can navigate from home to a category, open a product, and then use the global search bar to find a different item.

## Test Scenarios

### 1. Home → Category → Product → Search

**Seed:** `tests/seed.spec.ts`

#### 1.1. Browse category, open product, then search for another item

**File:** `tests/e2e/browse-category-and-search.spec.ts`

**Steps:**
  1. Navigate to the Home page ("/") in a new browser session.
    - expect: URL is "/" or redirects to home.
    - expect: Page displays a heading containing "All Products" or equivalent home product listing.
  2. From the top navigation, open the "Categories" dropdown and click "All Categories" (or navigate to "/categories" directly).
    - expect: URL contains "/categories".
    - expect: Page displays a list of categories (at least one category tile/button is visible).
  3. Click on any category in the categories list to go to its category details page.
    - expect: URL changes to "/category/<slug>".
    - expect: Page shows a heading like "Category - <CategoryName>" and a list of products (at least one product card is visible).
  4. From the category product list, click the first product's "More Details" button to go to the product detail page.
    - expect: URL changes to "/product/<slug>".
    - expect: Product detail page shows the product name/title and product image.
  5. Use the global header search bar: enter a different valid keyword (not the current product name) and submit the form.
    - expect: URL changes to "/search".
    - expect: Search results page displays a heading "Search Results" (or similar) and shows at least one product card.
    - expect: Search results are updated based on the entered keyword.
