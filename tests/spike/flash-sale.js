import http from 'k6/http';
import { check, sleep } from 'k6';

// Name: [Your Name Here]
// Student ID: [Your Student ID Here]

// Scenario: Spike Testing - Flash Sale Browsing Peak
// Testing the sudden traffic surge hitting homepage listings, categories, pagination, and search.
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
    // We want 95% of requests to complete inside 2 seconds
    http_req_duration: ['p(95)<2000'],
    // We want a very low failure rate
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
  
  sleep(1); // User scrolls the page for 1s

  // 2. Simulate User clicking "Load More" (Pagination fetch)
  const paginationRes = http.get(`${BASE_URL}/product/product-list/2`);
  check(paginationRes, { 'Pagination page 2 loaded': (r) => r.status === 200 });

  sleep(1); // User considers searching

  // 3. Simulate User performing a generic Search
  const searchRes = http.get(`${BASE_URL}/product/search/a`);
  check(searchRes, { 'Search completed successfully': (r) => r.status === 200 });

  // 4. Simulate a User filtering on categories/price ranges (POST request)
  const filterPayload = JSON.stringify({
    checked: [], // Insert mock category IDs if necessary
    radio: [0, 100], // Mock price array
  });
  
  const filterParams = { headers: { 'Content-Type': 'application/json' } };
  
  const filterRes = http.post(`${BASE_URL}/product/product-filters`, filterPayload, filterParams);
  check(filterRes, { 'Product filtering resolved': (r) => r.status === 200 || r.status === 400 }); 
  
  sleep(1);
}
