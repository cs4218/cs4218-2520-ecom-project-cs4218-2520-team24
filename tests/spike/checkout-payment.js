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
    { duration: '10s', target: 5 },    // Warm baseline (idle browsing)
    { duration: '2s',  target: 1000 }, // Massive Thundering Herd spike 
    { duration: '30s', target: 1000 }, // Extended hold (force DB concurrency locks)
    { duration: '5s',  target: 0 },    // Instant drop
    { duration: '15s', target: 5 },    // Recovery observation window
  ],
  thresholds: {
    // Payment gateways should ideally resolve fast, but external APIs can drag
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.10'], // Less than 10% timeouts/rate-limits
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';

// Register and log in a dummy user to generate a valid JWT token
export function setup() {
  const email = `spike_shopper_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = `password123`;
  
  const headers = { 'Content-Type': 'application/json' };

  http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    name: 'Spike Tester', email: email, password: password, phone: '1234', address: '123 Spike Street', answer: 'Spike'
  }), { headers });

  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: email, password: password }), { headers });
  return loginRes.json('token'); 
}

export default function (token) {
  // 1. User loads the cart prices and requests a Braintree payment token
  // This is highly sensitive as it requires an external HTTP handshake to Braintree
  const tokenRes = http.get(`${BASE_URL}/product/braintree/token`);
  
  const tokenSuccess = check(tokenRes, { 
    'Braintree Token generated (Status 200)': (r) => r.status === 200,
    'Token body contains token/data': (r) => r.body && r.body.length > 0,
  });

  // Randomised think time between 1 and 3 seconds simulating real user reviewing cart
  sleep(Math.random() * 2 + 1);

  // 2. User attempts to submit a payment ONLY if token generation was successful
  if (tokenSuccess) {
    const paymentPayload = JSON.stringify({
      nonce: 'fake-valid-nonce',
      // MongoDB strictly requires a 24-character hex string for ObjectIds, so we use a valid dummy ID
      cart: [{ _id: '64b6e5e8e815ea7bfdb3c3f3', price: 100 }] 
    });

    const paymentParams = { 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': token 
      } 
    };

    const paymentRes = http.post(`${BASE_URL}/product/braintree/payment`, paymentPayload, paymentParams);
    
    check(paymentRes, { 
      'Payment Success (Expected 200)': (r) => r.status === 200,
      'Server error (unexpected 500)': (r) => r.status !== 500, // <--- Fails if it equals 500
      'Rate limited by external API (429)': (r) => r.status !== 429, // <--- Fails if it equals 429
    });
  } else {
    // Fails the checkout journey implicitly if token failed
    check(tokenRes, { 'Checkout journey failed at token stage (Did not attempt payment)': () => false });
  }
  
  sleep(1);
}
