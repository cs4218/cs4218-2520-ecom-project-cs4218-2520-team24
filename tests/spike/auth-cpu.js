// Leong Yu Jun Nicholas A0257284W

import http from 'k6/http';
import { check, sleep } from 'k6';

// Scenario: Spike Testing - Authentication CPU Throttling
// Pattern: "Sustained High-Load Attack + Background Traffic"
// Why this pattern?: Node.js is single-threaded. Bcrypt password hashing 
// forces the CPU into blocking computations. If 100 people register simultaneously, 
// the server freezes hashing passwords. To prove this, we run two scenarios at once.

export const options = {
  scenarios: {
    // 1. Normal users just browsing products (Constantly running in the background)
    background_browsers: {
      executor: 'constant-vus',
      vus: 40, // Increased to 40 VUs to make CPU starvation more obvious
      duration: '60s', // 60 seconds total
      exec: 'browseCatalog',
    },
    // 2. The sudden spike of users registering (Hitting the CPU hard with Bcrypt!)
    register_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '10s',  // Starts 10 seconds in to establish a clean baseline
      stages: [
        { duration: '5s',  target: 120 }, // EXPLODE to 120 concurrent hashes
        { duration: '30s', target: 120 }, // Hold the CPU hostage for longer
        { duration: '15s', target: 0 },   // Back off
      ],
      exec: 'burstRegister',
    },
  },
  thresholds: {
    'http_req_duration{scenario:register_spike}': ['p(95)<3000'],
    'http_req_duration{scenario:background_browsers}': ['p(95)<500'] // We expect this SLA to fail horribly due to CPU blocking
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';

// Function 1: Normal user loading the homepage APIs
export function browseCatalog() {
  const responses = http.batch({
    'categories': { method: 'GET', url: `${BASE_URL}/category/get-category` },
    'productCount': { method: 'GET', url: `${BASE_URL}/product/product-count` },
    'productList': { method: 'GET', url: `${BASE_URL}/product/product-list/1` },
  });

  check(responses['productCount'], {
    'Background catalog loaded': (r) => r.status === 200,
  });
  
  sleep(1);
}

// Function 2: The Attack / The Heavy Bcrypt Spike
export function burstRegister() {
  // Using dynamic emails ensures we never hit a DB unique constraint early,
  // guaranteeing that the CPU-intensive bcrypt.hash() runs on EVERY request.
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

  check(registerRes, {
    'Register resolved (Success or 500)': (r) => r.status === 201 || r.status === 200 || r.status === 500,
  });

  sleep(1);
}
