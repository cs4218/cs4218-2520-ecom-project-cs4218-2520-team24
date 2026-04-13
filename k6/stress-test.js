// Nam Dohyun
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics for Grafana dashboard
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const registeredUsers = new Counter("registered_users");

// Aggressive Stress Test Configuration
export const options = {
  stages: [
    { duration: "2m", target: 20 },  // Warm up: Initialize connections & JIT compiler
    // { duration: "3m", target: 100 }, // First real stressor
    // { duration: "3m", target: 100 },  // Ramp up to 100 users
    // { duration: "3m", target: 200 },  // Ramp up to 200 users
    // { duration: "3m", target: 300 },  // Ramp up to 300 users
    // { duration: "3m", target: 400 },  // Ramp up to 400 users
    { duration: "3m", target: 500 },  // Ramp up to 500 users
    { duration: "3m", target: 600 },  // Ramp up to 600 users
    { duration: "3m", target: 700 },  // Hold at 700 users
    { duration: "3m", target: 800 },  // Hold at 800 users
    { duration: "3m", target: 1000 }, // Peak at 1000 users
    { duration: "2m", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.1"],    // Error rate should be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const API = `${BASE_URL}/api/v1`;

function testEmail(vuId, iter) {
  return `k6_stress_vu${vuId}_i${iter}@test.com`;
}

function trackResponse(response, name) {
  responseTime.add(response.timings.duration);
  errorRate.add(response.status >= 400);
  check(response, {
    [`${name}: status OK`]: (r) => r.status >= 200 && r.status < 400,
    [`${name}: response time < 1000ms`]: (r) => r.timings.duration < 1000,
  });
}

const jsonHeaders = { "Content-Type": "application/json" };

export default function () {
  const vuId = __VU;
  const iter = __ITER;
  const email = testEmail(vuId, iter);
  const password = "K6StressTest123!";
  let token = null;
  let isRegistered = false;

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
      isRegistered = true;
    }
  });

  // FAIL-FAST: If registration failed (likely due to WaitQueueTimeout), 
  // stop this iteration to avoid creating "ghost traffic" on other endpoints.
  if (!isRegistered) {
    return;
  }

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
    } catch (_) { }
  });

  // If login fails, we can't do authenticated steps, but we can still browse.
  sleep(1);

  // ─── Step 3: Browse categories ───
  let categories = [];
  group("03 - Browse Categories", () => {
    const res = http.get(`${API}/category/get-category`);
    trackResponse(res, "Get Categories");

    try {
      const body = JSON.parse(res.body);
      if (body.category && body.category.length > 0) {
        categories = body.category;
      }
    } catch (_) { }
  });

  sleep(1);

  // ─── Step 4: Browse products ───
  let products = [];
  group("04 - Browse Products", () => {
    const countRes = http.get(`${API}/product/product-count`);
    trackResponse(countRes, "Product Count");

    const listRes = http.get(`${API}/product/product-list/1`);
    trackResponse(listRes, "Product List Page 1");

    try {
      const body = JSON.parse(listRes.body);
      if (body.products && body.products.length > 0) {
        products = body.products;
      }
    } catch (_) { }

    const listRes2 = http.get(`${API}/product/product-list/2`);
    trackResponse(listRes2, "Product List Page 2");

    try {
      const body = JSON.parse(listRes2.body);
      if (body.products && body.products.length > 0) {
        products = products.concat(body.products);
      }
    } catch (_) { }
  });

  sleep(1);

  // ─── Step 5: View a single product detail page ───
  group("05 - View Product Detail", () => {
    if (products.length === 0) return;

    const product = products[Math.floor(Math.random() * products.length)];
    const res = http.get(`${API}/product/get-product/${product.slug}`);
    trackResponse(res, "Get Single Product");

    const photoRes = http.get(`${API}/product/product-photo/${product._id}`);
    trackResponse(photoRes, "Product Photo");

    if (product.category) {
      const categoryId = typeof product.category === "object" ? product.category._id : product.category;
      const relatedRes = http.get(`${API}/product/related-product/${product._id}/${categoryId}`);
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

  // ─── Step 7: Filter products ───
  group("07 - Filter Products", () => {
    const priceRanges = [[0, 19], [20, 39], [40, 59], [60, 79], [80, 99], [100, 9999]];
    const priceRange = priceRanges[Math.floor(Math.random() * priceRanges.length)];

    const filterPayload = JSON.stringify({ checked: [], radio: priceRange });
    const res = http.post(`${API}/product/product-filters`, filterPayload, { headers: jsonHeaders });
    trackResponse(res, "Filter by Price");

    if (categories.length > 0) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const filterPayload2 = JSON.stringify({ checked: [cat._id], radio: priceRange });
      const res2 = http.post(`${API}/product/product-filters`, filterPayload2, { headers: jsonHeaders });
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

  // ─── Step 9: Auth check ───
  group("09 - Auth Check", () => {
    if (!token) return;
    const res = http.get(`${API}/auth/user-auth`, { headers: { Authorization: token } });
    trackResponse(res, "User Auth Check");
  });

  sleep(1);

  // ─── Step 10: View orders ───
  group("10 - View Orders", () => {
    if (!token) return;
    const res = http.get(`${API}/auth/orders`, { headers: { Authorization: token } });
    trackResponse(res, "Get User Orders");
  });

  sleep(1);
}

export function setup() {
  const res = http.get(BASE_URL);
  check(res, { "server is reachable": (r) => r.status === 200 });
  return {};
}

export function teardown(data) {
  console.log("Stress test completed. Cleanup with:");
  console.log("mongosh ecommerce --eval 'db.users.deleteMany({email: /^k6_stress_vu.*@test\\.com$/})'");
}