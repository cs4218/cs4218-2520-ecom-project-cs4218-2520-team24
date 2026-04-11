// Leong Yu Jun Nicholas A0257284W

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
// Per-endpoint latency tracking to identify which API degrades first.
const homepageLatency   = new Trend('homepage_latency', true);
const paginationLatency = new Trend('pagination_latency', true);
const searchLatency     = new Trend('search_latency', true);
const filterLatency     = new Trend('filter_latency', true);
const endpointErrors    = new Counter('endpoint_errors');
const requestSuccessRate = new Rate('request_success_rate');

// ─── Scenario: Spike Testing — Flash Sale Browsing Peak (Cumulative Step-Up) ─
// Pattern: "Progressive Step-Up with Recovery Observation"
//
// Why this pattern?
// Unlike flash-sale.js (isolated waves), this test uses a single continuous
// `stages` array to observe **cumulative system degradation** over time:
//   1. Spike to 200 → recover → did the system fully restore?
//   2. Spike to 500 → recover → is recovery slower after higher load?
//   3. Spike to 1000 → cooldown — any permanent damage?
//
// This reveals issues that isolated tests miss:
//   - MongoDB connection pool exhaustion that doesn't recover
//   - Node.js memory leaks from buffered responses
//   - Event loop delays that compound across successive spikes
//
// Trade-off vs flash-sale.js:
// flash-sale.js gives per-tier SLA compliance ("200 VUs = OK, 500 = marginal").
// This test answers "does damage accumulate across successive spikes?"
// The same workload function is intentionally reused to isolate the variable:
// the load pattern shape.

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // warm baseline
    { duration: '10s', target: 200 },  // spike 1
    { duration: '30s', target: 200 },  // hold — observe behavior at 200
    { duration: '10s', target: 10 },   // recover
    { duration: '30s', target: 10 },   // recovery observation window 1
    { duration: '10s', target: 500 },  // spike 2
    { duration: '30s', target: 500 },  // hold — observe behavior at 500
    { duration: '10s', target: 10 },   // recover
    { duration: '30s', target: 10 },   // recovery observation window 2
    { duration: '10s', target: 1000 }, // spike 3
    { duration: '30s', target: 1000 }, // hold — observe behavior at 1000
    { duration: '10s', target: 0 },    // cooldown
  ],
  thresholds: {
    // Global thresholds — evaluating cumulative stress across all phases
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],       // <5% errors across entire run
    // Per-endpoint custom thresholds
    'homepage_latency':   ['p(95)<3000'],
    'search_latency':     ['p(95)<4000'],  // Regex search expected to be slowest
    'pagination_latency': ['p(95)<2000'],
    'filter_latency':     ['p(95)<3000'],
    'request_success_rate': ['rate>0.90'], // 90%+ requests should succeed overall
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';

export default function () {
  // ─── Step 1: Simulate homepage load ─────────────────────────────────────────
  const homeResponses = http.batch({
    'categories':  { method: 'GET', url: `${BASE_URL}/category/get-category`,  tags: { endpoint: 'get-category' } },
    'productCount':{ method: 'GET', url: `${BASE_URL}/product/product-count`,  tags: { endpoint: 'product-count' } },
    'productList': { method: 'GET', url: `${BASE_URL}/product/product-list/1`, tags: { endpoint: 'product-list' } },
  });

  const maxHomeLatency = Math.max(
    homeResponses['categories'].timings.duration,
    homeResponses['productCount'].timings.duration,
    homeResponses['productList'].timings.duration
  );
  homepageLatency.add(maxHomeLatency);

  const homePassed = check(homeResponses['categories'], { 'Categories loaded (200)': (r) => r.status === 200 }) &&
    check(homeResponses['productCount'], { 'Product count loaded (200)': (r) => r.status === 200 }) &&
    check(homeResponses['productList'], { 'Product list page 1 loaded (200)': (r) => r.status === 200 });

  requestSuccessRate.add(homePassed ? 1 : 0);
  if (!homePassed) endpointErrors.add(1);

  sleep(1);

  // ─── Step 2: Simulate "Load More" pagination ───────────────────────────────
  const paginationRes = http.get(`${BASE_URL}/product/product-list/2`, {
    tags: { endpoint: 'product-list-page2' },
  });
  paginationLatency.add(paginationRes.timings.duration);
  const pagPassed = check(paginationRes, { 'Pagination page 2 loaded (200)': (r) => r.status === 200 });
  requestSuccessRate.add(pagPassed ? 1 : 0);

  sleep(1);

  // ─── Step 3: Simulate search ────────────────────────────────────────────────
  const searchRes = http.get(`${BASE_URL}/product/search/a`, {
    tags: { endpoint: 'search' },
  });
  searchLatency.add(searchRes.timings.duration);
  const searchPassed = check(searchRes, { 'Search completed (200)': (r) => r.status === 200 });
  requestSuccessRate.add(searchPassed ? 1 : 0);

  // ─── Step 4: Simulate category/price filtering ─────────────────────────────
  const filterPayload = JSON.stringify({
    checked: [],
    radio: [0, 100],
  });

  const filterRes = http.post(`${BASE_URL}/product/product-filters`, filterPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'product-filters' },
  });
  filterLatency.add(filterRes.timings.duration);
  const filterPassed = check(filterRes, { 'Product filtering resolved (200 or 400)': (r) => r.status === 200 || r.status === 400 });
  requestSuccessRate.add(filterPassed ? 1 : 0);

  sleep(1);
}

// ─── Structured output for report statistics ──────────────────────────────────
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './tests/spike/results/flash-sale-stepup-results.json': JSON.stringify(data, null, 2),
  };
}
