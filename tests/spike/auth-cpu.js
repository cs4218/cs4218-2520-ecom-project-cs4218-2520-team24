// Leong Yu Jun Nicholas A0257284W

import http from 'k6/http';
import { check, sleep } from 'k6';

// Scenario: Spike Testing - Authentication CPU Throttling
// Pattern: "Sustained High-Load Attack + Background Traffic"
// Why this pattern?: Node.js is single-threaded. Bcrypt password hashing 
// forces the CPU into blocking computations. If 100 people log in simultaneously, 
// the server freezes. To prove this, we run two scenarios at once: background 
// users reading the homepage, and a sudden massive spike of attackers/users logging in.
// We expect the homepage read speeds to completely crash when the auth spike hits!

export const options = {
  scenarios: {
    // 1. Normal users just browsing products (Constantly running in the background)
    background_browsers: {
      executor: 'constant-vus',
      vus: 20, 
      duration: '40s', // 40 seconds total
      exec: 'browseCatalog', // Use the browseCatalog function below
    },
    // 2. The sudden spike of users logging in (Hitting the CPU hard with Bcrypt!)
    login_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 0 },   // Start late (Wait 10 seconds to establish baseline)
        { duration: '5s', target: 120 },  // EXPLODE to 120 concurrent logins in 5 seconds
        { duration: '15s', target: 120 }, // Hold the CPU hostage
        { duration: '10s', target: 0 },   // Back off
      ],
      exec: 'burstLogin', // Use the burstLogin function below
    },
  },
  thresholds: {
    // We expect the CPU starvation to potentially fail requests
    'http_req_duration{scenario:login_spike}': ['p(95)<3000'],
    'http_req_duration{scenario:background_browsers}': ['p(95)<500'] // Background browsers should IDEALLY be fast...
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';

// Function 1: Normal user loading the homepage API
export function browseCatalog() {
  const browserRes = http.get(`${BASE_URL}/product/product-count`);
  
  check(browserRes, {
    'Background catalog loaded': (r) => r.status === 200,
  });
  
  sleep(0.5);
}

// Function 2: The Attack / The Heavy Login Spike
export function burstLogin() {
  // Passwords hashing is insanely slow by design.
  const payload = JSON.stringify({
    email: 'nonexistent@example.com',
    password: 'password123'
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, payload, params);

  check(loginRes, {
    'Login resolved (Success or 404)': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1);
}
