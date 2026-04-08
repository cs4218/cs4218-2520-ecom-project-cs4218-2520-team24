// Leong Yu Jun Nicholas A0257284W

import http from 'k6/http';
import { check, sleep } from 'k6';

// Scenario: Spike Testing - Checkout & Payment Bottleneck
// Pattern: "The Thundering Herd" (Needle Spike)
// Why this pattern?: When limited stock drops (e.g., sneaker releases), users 
// wait on the cart page and click "Checkout" at the exact same second. 
// We want an immediate, aggressive burst instead of a gradual ramp-up to heavily 
// stress third-party APIs (Braintree) and database record locking.

export const options = {
  stages: [
    { duration: '2s', target: 150 },  // Instantaneous needle spike to 150 VUs
    { duration: '15s', target: 150 }, // Hold for just 15 seconds (Checkout panic is fast)
    { duration: '5s', target: 0 },    // Drop off instantly
  ],
  thresholds: {
    // Payment gateways should ideally resolve fast, but external APIs can drag
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.10'], // Less than 10% timeouts/rate-limits
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';

export default function () {
  // 1. User loads the cart prices and requests a Braintree payment token
  // This is highly sensitive as it requires an external HTTP handshake to Braintree
  const tokenRes = http.get(`${BASE_URL}/product/braintree/token`);
  
  check(tokenRes, { 
    'Braintree Token generated (Status 200)': (r) => r.status === 200,
    // Warning: If Braintree rate-limits us, we might see 429 or 500s here!
  });

  sleep(0.5);

  // 2. User attempts to submit a payment
  // Note: Since we are not logging in a real user with a valid JWT in this raw spike,
  // we expect a 401 Unauthorized or 500, but we are still testing the router overhead 
  // and middleware processing speed under extreme contention.
  const paymentPayload = JSON.stringify({
    nonce: 'fake-valid-nonce',
    cart: [{ _id: 'mock-product-id', price: 100 }]
  });

  const paymentParams = { 
    headers: { 
      'Content-Type': 'application/json',
      // 'Authorization': 'Bearer <token>' // Omitted for raw middleware stress test
    } 
  };

  const paymentRes = http.post(`${BASE_URL}/product/braintree/payment`, paymentPayload, paymentParams);
  
  check(paymentRes, { 
    'Payment Endpoint reached (Handled Auth Rejection or Success)': (r) => r.status === 200 || r.status === 401 || r.status === 500 
  });
  
  sleep(1);
}
