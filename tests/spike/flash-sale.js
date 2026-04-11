// Leong Yu Jun Nicholas A0257284W

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
// Per-endpoint latency tracking reveals which API degrades first under load.
const homepageLatency   = new Trend('homepage_latency', true);
const paginationLatency = new Trend('pagination_latency', true);
const searchLatency     = new Trend('search_latency', true);
const filterLatency     = new Trend('filter_latency', true);
const endpointErrors    = new Counter('endpoint_errors');

// ─── Scenario: Spike Testing — Flash Sale Browsing Peak (Isolated Waves) ─────
// Pattern: "Progressive Escalation with Isolated Scenarios"
//
// Why this pattern?
// A flash sale announcement goes viral in stages — first shared among a small
// community (200 users), then trending (500), then mainstream (1000).
// By running each wave as an independent scenario we get:
//   1. Per-wave SLA thresholds (tighter for 200 VUs, relaxed for 1000)
//   2. Clean isolation — no carry-over state between waves
//   3. Direct comparison: "at 200 VUs search takes Xms, at 1000 VUs it takes Yms"
//
// Trade-off vs flash-sale-stepup.js:
// This test does NOT observe recovery between waves (waves run sequentially
// with minimal gap). Use flash-sale-stepup.js for resilience/recovery testing.

export const options = {
  scenarios: {
    // Wave 1: 200 concurrent users
    spike_200_users: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 10 },  // warm baseline
        { duration: '10s', target: 200 }, // spike 1
        { duration: '30s', target: 200 }, // hold
        { duration: '10s', target: 0 },   // drop to 0
      ],
      gracefulRampDown: '5s',
    },
    // Wave 2: 500 concurrent users
    spike_500_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '85s', // Starts after 200 wave finishes + 5s buffer
      stages: [
        { duration: '10s', target: 500 }, // spike 2
        { duration: '30s', target: 500 }, // hold
        { duration: '10s', target: 0 },   // drop to 0
      ],
      gracefulRampDown: '5s',
    },
    // Wave 3: 1000 concurrent users (system breaking point)
    spike_1000_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '140s', // Starts after 500 wave finishes + 5s buffer
      stages: [
        { duration: '10s', target: 1000 }, // spike 3
        { duration: '30s', target: 1000 }, // hold
        { duration: '10s', target: 0 },    // cooldown
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    // Per-scenario SLA thresholds (progressively relaxed for higher load)
    'http_req_duration{scenario:spike_200_users}':  ['p(95)<2000'],
    'http_req_duration{scenario:spike_500_users}':  ['p(95)<4000'],
    'http_req_duration{scenario:spike_1000_users}': ['p(95)<6000'],
    // Per-scenario error rate thresholds
    'http_req_failed{scenario:spike_200_users}':  ['rate<0.02'],  // ≤2% at 200 VUs
    'http_req_failed{scenario:spike_500_users}':  ['rate<0.05'],  // ≤5% at 500 VUs
    'http_req_failed{scenario:spike_1000_users}': ['rate<0.15'],  // ≤15% at 1000 VUs
    // Per-endpoint custom metric thresholds
    'homepage_latency':   ['p(95)<3000'],
    'search_latency':     ['p(95)<4000'],  // Search does regex scan — expect slower
    'pagination_latency': ['p(95)<2000'],
    'filter_latency':     ['p(95)<3000'],
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';

export default function () {
  // ─── Step 1: Simulate homepage load ─────────────────────────────────────────
  // Fetches categories, product count, and initial product list in parallel.
  // This mirrors the actual React frontend's componentDidMount behavior.
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

  check(homeResponses['categories'],  { 'Categories loaded (200)': (r) => r.status === 200 });
  check(homeResponses['productCount'],{ 'Product count loaded (200)': (r) => r.status === 200 });
  check(homeResponses['productList'], { 'Product list page 1 loaded (200)': (r) => r.status === 200 });

  if (homeResponses['categories'].status !== 200 ||
      homeResponses['productCount'].status !== 200 ||
      homeResponses['productList'].status !== 200) {
    endpointErrors.add(1);
  }

  sleep(1); // User scrolls the page

  // ─── Step 2: Simulate "Load More" pagination ───────────────────────────────
  const paginationRes = http.get(`${BASE_URL}/product/product-list/2`, {
    tags: { endpoint: 'product-list-page2' },
  });
  paginationLatency.add(paginationRes.timings.duration);
  check(paginationRes, { 'Pagination page 2 loaded (200)': (r) => r.status === 200 });

  sleep(1); // User considers searching

  // ─── Step 3: Simulate search ────────────────────────────────────────────────
  // "a" is intentionally broad — it forces MongoDB's $regex to scan many documents,
  // representing a worst-case search scenario under spike load.
  const searchRes = http.get(`${BASE_URL}/product/search/a`, {
    tags: { endpoint: 'search' },
  });
  searchLatency.add(searchRes.timings.duration);
  check(searchRes, { 'Search completed (200)': (r) => r.status === 200 });

  // ─── Step 4: Simulate category/price filtering ─────────────────────────────
  const filterPayload = JSON.stringify({
    checked: [],       // No category filter (tests price-only path)
    radio: [0, 100],   // Price range $0–$100
  });

  const filterRes = http.post(`${BASE_URL}/product/product-filters`, filterPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'product-filters' },
  });
  filterLatency.add(filterRes.timings.duration);
  check(filterRes, { 'Product filtering resolved (200 or 400)': (r) => r.status === 200 || r.status === 400 });

  sleep(1);
}

// ─── Structured output for report statistics ──────────────────────────────────
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './tests/spike/results/flash-sale-results.json': JSON.stringify(data, null, 2),
  };
}
