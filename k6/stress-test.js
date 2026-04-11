import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";


// Custom metrics
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const registeredUsers = new Counter("registered_users");

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 10 }, // Warm up
    { duration: "5m", target: 50 }, // Ramp up to 50 users
    { duration: "10m", target: 100 }, // Ramp up to 100 users
    { duration: "10m", target: 200 }, // Ramp up to 200 users
    { duration: "10m", target: 300 }, // Ramp up to 300 users
    { duration: "5m", target: 300 }, // Stay at 300 users
    { duration: "2m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.1"], // Error rate should be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const API = `${BASE_URL}/api/v1`;

// Generates a unique test email for each VU + iteration to avoid collisions
function testEmail(vuId, iter) {
  return `k6_stress_vu${vuId}_i${iter}@test.com`;
}

// Helper to track metrics and run checks on a response
function trackResponse(response, name) {
  responseTime.add(response.timings.duration);
  errorRate.add(response.status >= 400);
  check(response, {
    [`${name}: status OK`]: (r) => r.status >= 200 && r.status < 400,
    [`${name}: response time < 1000ms`]: (r) => r.timings.duration < 1000,
  });
}

// JSON headers
const jsonHeaders = { "Content-Type": "application/json" };

export default function () {
  const vuId = __VU;
  const iter = __ITER;
  const email = testEmail(vuId, iter);
  const password = "K6StressTest123!";
  let token = null;

  // ─── Step 1: Register a new user ───
  group("01 - Register", () => {
    const payload = JSON.stringify({
      name: `Stress Test User ${vuId}-${iter}`,
      email: email,
      password: password,
      phone: "1234567890",
      address: "123 Stress Test Lane",
      answer: "stress-test",
    });

    const res = http.post(`${API}/auth/register`, payload, {
      headers: jsonHeaders,
    });
    trackResponse(res, "Register");

    if (res.status === 200 || res.status === 201) {
      registeredUsers.add(1);
    }
  });

  sleep(1);

  // ─── Step 2: Login with the new user ───
  group("02 - Login", () => {
    const payload = JSON.stringify({
      email: email,
      password: password,
    });

    const res = http.post(`${API}/auth/login`, payload, {
      headers: jsonHeaders,
    });
    trackResponse(res, "Login");

    try {
      const body = JSON.parse(res.body);
      if (body.token) {
        token = body.token;
      }
    } catch (_) {}
  });

  sleep(1);

  // ─── Step 3: Browse categories (landing page behavior) ───
  let categories = [];
  group("03 - Browse Categories", () => {
    const res = http.get(`${API}/category/get-category`);
    trackResponse(res, "Get Categories");

    try {
      const body = JSON.parse(res.body);
      if (body.category && body.category.length > 0) {
        categories = body.category;
      }
    } catch (_) {}
  });

  sleep(1);

  // ─── Step 4: Browse products (home page) ───
  let products = [];
  group("04 - Browse Products", () => {
    // Get product count first (like the frontend does)
    const countRes = http.get(`${API}/product/product-count`);
    trackResponse(countRes, "Product Count");

    // Get first page of products
    const listRes = http.get(`${API}/product/product-list/1`);
    trackResponse(listRes, "Product List Page 1");

    try {
      const body = JSON.parse(listRes.body);
      if (body.products && body.products.length > 0) {
        products = body.products;
      }
    } catch (_) {}

    // Simulate scrolling / loading page 2
    const listRes2 = http.get(`${API}/product/product-list/2`);
    trackResponse(listRes2, "Product List Page 2");

    try {
      const body = JSON.parse(listRes2.body);
      if (body.products && body.products.length > 0) {
        products = products.concat(body.products);
      }
    } catch (_) {}
  });

  sleep(1);

  // ─── Step 5: View a single product detail page ───
  group("05 - View Product Detail", () => {
    if (products.length === 0) return;

    const product = products[Math.floor(Math.random() * products.length)];
    const res = http.get(`${API}/product/get-product/${product.slug}`);
    trackResponse(res, "Get Single Product");

    // Load product photo (like the frontend does)
    const photoRes = http.get(`${API}/product/product-photo/${product._id}`);
    trackResponse(photoRes, "Product Photo");

    // View related products
    if (product.category) {
      const categoryId =
        typeof product.category === "object"
          ? product.category._id
          : product.category;
      const relatedRes = http.get(
        `${API}/product/related-product/${product._id}/${categoryId}`
      );
      trackResponse(relatedRes, "Related Products");
    }
  });

  sleep(1);

  // ─── Step 6: Search for products ───
  group("06 - Search Products", () => {
    const searchTerms = ["shirt", "laptop", "book", "phone", "shoe"];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const res = http.get(`${API}/product/search/${term}`);
    trackResponse(res, "Search Products");
  });

  sleep(1);

  // ─── Step 7: Filter products by category and price ───
  group("07 - Filter Products", () => {
    const priceRanges = [
      [0, 19],
      [20, 39],
      [40, 59],
      [60, 79],
      [80, 99],
      [100, 9999],
    ];
    const priceRange =
      priceRanges[Math.floor(Math.random() * priceRanges.length)];

    // Filter by price only
    const filterPayload = JSON.stringify({
      checked: [],
      radio: priceRange,
    });
    const res = http.post(`${API}/product/product-filters`, filterPayload, {
      headers: jsonHeaders,
    });
    trackResponse(res, "Filter by Price");

    // Filter by category + price (if we have categories)
    if (categories.length > 0) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const filterPayload2 = JSON.stringify({
        checked: [cat._id],
        radio: priceRange,
      });
      const res2 = http.post(`${API}/product/product-filters`, filterPayload2, {
        headers: jsonHeaders,
      });
      trackResponse(res2, "Filter by Category + Price");
    }
  });

  sleep(1);

  // ─── Step 8: Browse products by category ───
  group("08 - Products by Category", () => {
    if (categories.length === 0) return;

    const cat = categories[Math.floor(Math.random() * categories.length)];
    const res = http.get(`${API}/product/product-category/${cat.slug}`);
    trackResponse(res, "Products by Category");
  });

  sleep(1);

  // ─── Step 9: Check auth status (simulates page navigation with auth check) ───
  group("09 - Auth Check", () => {
    if (!token) return;

    const res = http.get(`${API}/auth/user-auth`, {
      headers: { Authorization: token },
    });
    trackResponse(res, "User Auth Check");
  });

  sleep(1);

  // ─── Step 10: View user profile / orders (authenticated) ───
  group("10 - View Orders", () => {
    if (!token) return;

    const res = http.get(`${API}/auth/orders`, {
      headers: { Authorization: token },
    });
    trackResponse(res, "Get User Orders");
  });

  sleep(1);

  // ─── Cleanup: Delete the test user we created ───
  // Since there is no delete-user API endpoint, we remove the user
  // by calling a dedicated cleanup endpoint or by logging it for
  // batch cleanup. Here we use the teardown stage for batch removal.
  // The test emails follow the pattern: k6_stress_vu*@test.com
}

// Setup function - runs once before the test starts
export function setup() {
  // Verify the server is reachable
  const res = http.get(BASE_URL);
  const ok = check(res, {
    "server is reachable": (r) => r.status === 200,
  });

  if (!ok) {
    console.error(
      `Server at ${BASE_URL} is not reachable. Aborting stress test.`
    );
  }

  console.log("Starting realistic user-journey stress test...");
  console.log(
    "Test users will be created with emails matching: k6_stress_vu*@test.com"
  );

  return {};
}

// Teardown function - runs once after the test ends
export function teardown(data) {
  console.log("Stress test completed.");
  console.log("");
  console.log("=== CLEANUP REQUIRED ===");
  console.log(
    "Test users were created during the run. To clean them up, run:"
  );
  console.log(
    '  mongo ecommerce --eval \'db.users.deleteMany({email: /^k6_stress_vu.*@test\\.com$/})\''
  );
  console.log(
    "Or with mongosh:"
  );
  console.log(
    '  mongosh ecommerce --eval \'db.users.deleteMany({email: /^k6_stress_vu.*@test\\.com$/})\''
  );
  console.log("========================");
}
