// Leong Yu Jun Nicholas A0257284W

import http from 'k6/http';
import { check, sleep } from 'k6';

// Scenario: Spike Testing - Flash Sale Browsing Peak (Global Step-Up Pattern)
// Testing the sudden traffic surge hitting homepage listings, categories, pagination, and search.
// This uses a single continuous `stages` array to observe cumulative system degradation over time.
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // warm baseline
    { duration: '10s', target: 200 },  // spike 1
    { duration: '30s', target: 200 },  // hold
    { duration: '10s', target: 10 },   // recover
    { duration: '30s', target: 10 },   // observe recovery
    { duration: '10s', target: 500 },  // spike 2
    { duration: '30s', target: 500 },  // hold
    { duration: '10s', target: 10 },   // recover
    { duration: '30s', target: 10 },   // observe recovery
    { duration: '10s', target: 1000 }, // spike 3
    { duration: '30s', target: 1000 }, // hold
    { duration: '10s', target: 0 },    // cooldown
  ],
  thresholds: {
    // Global thresholds evaluating the cumulative stress
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'], // < 5% errors
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';

export default function () {
  // 1. Simulate homepage load (fetches categories, product total count, and initial products)
  const homeRequests = {
    'categories': { method: 'GET', url: `${BASE_URL}/category/get-category` },
    'productCount': { method: 'GET', url: `${BASE_URL}/product/product-count` },
    'productList': { method: 'GET', url: `${BASE_URL}/product/product-list/1` },
  };

  const homeResponses = http.batch(homeRequests);

  // Validate the homepage API calls
  check(homeResponses['categories'], { 'Categories loaded successfully': (r) => r.status === 200 });
  check(homeResponses['productCount'], { 'Product count loaded successfully': (r) => r.status === 200 });
  check(homeResponses['productList'], { 'Product list page 1 loaded successfully': (r) => r.status === 200 });
  
  sleep(1);

  // 2. Simulate User clicking "Load More" (Pagination fetch)
  const paginationRes = http.get(`${BASE_URL}/product/product-list/2`);
  check(paginationRes, { 'Pagination page 2 loaded': (r) => r.status === 200 });

  sleep(1);

  // 3. Simulate User performing a generic Search
  const searchRes = http.get(`${BASE_URL}/product/search/a`);
  check(searchRes, { 'Search completed successfully': (r) => r.status === 200 });

  // 4. Simulate a User filtering on categories/price ranges
  const filterPayload = JSON.stringify({
    checked: [], 
    radio: [0, 100], 
  });
  
  const filterParams = { headers: { 'Content-Type': 'application/json' } };
  
  const filterRes = http.post(`${BASE_URL}/product/product-filters`, filterPayload, filterParams);
  check(filterRes, { 'Product filtering resolved': (r) => r.status === 200 || r.status === 400 }); 
  
  sleep(1);
}
