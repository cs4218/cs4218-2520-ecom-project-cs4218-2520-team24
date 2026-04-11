// Leong Yu Jun Nicholas A0257284W

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
// These give us endpoint-level granularity beyond k6's built-in aggregates.
const registerLatency = new Trend('register_latency', true);    // Registration-only response time
const catalogLatency  = new Trend('catalog_latency', true);     // Background browsing response time
const registerErrors  = new Counter('register_errors');          // Count of 5xx on registration
const catalogErrors   = new Counter('catalog_errors');           // Count of failures on catalog
const registerSuccessRate = new Rate('register_success_rate');   // % of successful registrations

// ─── Scenario: Spike Testing — Authentication CPU Throttling ──────────────────
// Pattern: "Sustained High-Load Attack + Background Traffic"
//
// Why this pattern?
// Node.js is single-threaded. bcrypt.hash() with saltRounds=10 forces the CPU
// into ~100ms of synchronous computation PER request. If 120 users register
// simultaneously, the event loop is blocked, and *all* other requests
// (including simple GET /product-list) queue behind the hash operations.
//
// Hypothesis: Background catalog response times (p95) will exceed the 500ms SLA
// during the registration spike, proving CPU starvation on unrelated endpoints.

export const options = {
  scenarios: {
    // Scenario A: Normal users browsing products (constant background traffic)
    background_browsers: {
      executor: 'constant-vus',
      vus: 40,
      duration: '60s',
      exec: 'browseCatalog',
    },
    // Scenario B: Sudden spike of user registrations (CPU-heavy bcrypt)
    register_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '10s',  // 10s delay to establish a clean baseline
      stages: [
        { duration: '5s',  target: 120 }, // Explode to 120 concurrent bcrypt hashes
        { duration: '30s', target: 120 }, // Sustained CPU pressure
        { duration: '15s', target: 0 },   // Back off — observe recovery
      ],
      exec: 'burstRegister',
    },
  },
  thresholds: {
    // Registration endpoint — generous SLA given bcrypt cost
    'http_req_duration{scenario:register_spike}': ['p(95)<3000'],
    // Catalog browsing — tight SLA; we EXPECT this to fail during the spike
    'http_req_duration{scenario:background_browsers}': ['p(95)<500'],
    // Custom metric thresholds
    'register_latency': ['p(95)<3000', 'avg<1500'],
    'catalog_latency':  ['p(95)<500', 'avg<200'],
    'register_success_rate': ['rate>0.70'],  // At least 70% should succeed
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';

// ─── Scenario A: Normal user loading the homepage APIs ────────────────────────
export function browseCatalog() {
  const responses = http.batch({
    'categories':  { method: 'GET', url: `${BASE_URL}/category/get-category`,  tags: { endpoint: 'get-category' } },
    'productCount':{ method: 'GET', url: `${BASE_URL}/product/product-count`,  tags: { endpoint: 'product-count' } },
    'productList': { method: 'GET', url: `${BASE_URL}/product/product-list/1`, tags: { endpoint: 'product-list' } },
  });

  // Track catalog latency using the slowest response in the batch
  const maxLatency = Math.max(
    responses['categories'].timings.duration,
    responses['productCount'].timings.duration,
    responses['productList'].timings.duration
  );
  catalogLatency.add(maxLatency);

  const passed = check(responses['productCount'], {
    'Background catalog loaded (200)': (r) => r.status === 200,
  });

  if (!passed) catalogErrors.add(1);

  sleep(1);
}

// ─── Scenario B: CPU-heavy registration spike ────────────────────────────────
export function burstRegister() {
  // Dynamic emails ensure every request triggers bcrypt.hash() — no early return
  // from the "Email already registered" check in registerController.
  const payload = JSON.stringify({
    name: 'Cpu Spike Tester',
    email: `spike_${__VU}_${__ITER}_${Date.now()}@example.com`,
    password: 'password_that_needs_hashing_123',
    phone: '1234567890',
    address: '123 Spike Ave',
    answer: 'Spike'
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const registerRes = http.post(`${BASE_URL}/auth/register`, payload, params);

  // Track custom metrics
  registerLatency.add(registerRes.timings.duration);

  // Separate checks for success vs failure — don't lump 500 into "resolved"
  const succeeded = check(registerRes, {
    'Registration succeeded (201)': (r) => r.status === 201,
  });

  check(registerRes, {
    'No server error (not 500)': (r) => r.status !== 500,
  });

  registerSuccessRate.add(succeeded ? 1 : 0);
  if (registerRes.status >= 500) registerErrors.add(1);

  sleep(1);
}

// ─── Structured output for report statistics ──────────────────────────────────
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './tests/spike/results/auth-cpu-results.json': JSON.stringify(data, null, 2),
  };
}
