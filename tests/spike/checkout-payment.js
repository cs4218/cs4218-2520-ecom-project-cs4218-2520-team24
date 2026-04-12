// Leong Yu Jun Nicholas A0257284W

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
const tokenLatency   = new Trend('braintree_token_latency', true);   // Braintree token generation time
const paymentLatency = new Trend('payment_latency', true);           // Payment submission time
const tokenErrors    = new Counter('braintree_token_errors');        // Token generation failures
const paymentErrors  = new Counter('payment_errors');                // Payment submission failures
const checkoutSuccessRate = new Rate('checkout_success_rate');       // End-to-end checkout success %

// ─── Scenario: Spike Testing — Checkout & Payment Bottleneck ──────────────────
// Pattern: "The Thundering Herd" (Needle Spike)
//
// Why this pattern?
// When limited stock drops (e.g., sneaker releases), users wait on the cart page
// and click "Checkout" at the exact same second. We simulate an immediate,
// aggressive burst (2s ramp to 1000 VUs) to stress:
//   1. Braintree's external API (token generation = outbound HTTP to third-party)
//   2. MongoDB order record creation under concurrency
//   3. Application-level error handling when external dependencies choke
//
// Key architectural risk: braintreeTokenController makes an outbound HTTP call
// that is entirely outside our application's control. Under spike load, this
// becomes the rate-limiting bottleneck regardless of server optimization.

export const options = {
  stages: [
    { duration: '10s', target: 5 },    // Warm baseline (idle browsing)
    { duration: '2s',  target: 1000 }, // Massive Thundering Herd spike
    { duration: '30s', target: 1000 }, // Extended hold (force DB concurrency + API rate limits)
    { duration: '5s',  target: 0 },    // Instant drop
    { duration: '15s', target: 5 },    // Recovery observation window
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.10'],     // Less than 10% timeouts/rate-limits
    // Custom metric thresholds
    'braintree_token_latency': ['p(95)<5000'],   // External API — generous SLA
    'payment_latency': ['p(95)<3000'],
    'checkout_success_rate': ['rate>0.50'],       // At least 50% end-to-end success
  },
};

const BASE_URL = 'http://localhost:6060/api/v1';
const NUM_USERS = 10; // Pool of distinct users to distribute across VUs

// ─── Setup: Create a pool of authenticated users ──────────────────────────────
// Creates NUM_USERS distinct accounts so different VUs simulate different users.
// This avoids the unrealistic scenario of 1000 VUs sharing a single JWT token.
export function setup() {
  const headers = { 'Content-Type': 'application/json' };
  const tokens = [];

  for (let i = 0; i < NUM_USERS; i++) {
    const email = `spike_shopper_${i}_${Date.now()}@example.com`;
    const password = 'password123';

    http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      name: `Spike Tester ${i}`,
      email: email,
      password: password,
      phone: '1234',
      address: '123 Spike Street',
      answer: 'Spike'
    }), { headers });

    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: email,
      password: password
    }), { headers });

    try {
      const token = loginRes.json('token');
      if (token) tokens.push(token);
    } catch (e) {
      // Login may fail if registration failed — skip this user
    }
  }

  if (tokens.length === 0) {
    throw new Error('Setup failed: could not create any authenticated users');
  }

  return { tokens };
}

export default function (data) {
  // Distribute VUs across the token pool (round-robin)
  const token = data.tokens[__VU % data.tokens.length];

  // ─── Step 1: User requests a Braintree payment token ────────────────────────
  // This is the critical external-API call. Under spike load, Braintree may
  // throttle or slow down, creating a bottleneck outside our control.
  const tokenRes = http.get(`${BASE_URL}/product/braintree/token`, {
    tags: { endpoint: 'braintree-token' },
  });

  tokenLatency.add(tokenRes.timings.duration);

  const tokenSuccess = check(tokenRes, {
    'Braintree Token generated (200)': (r) => r.status === 200,
    'Token body non-empty': (r) => r.body && r.body.length > 0,
  });

  if (!tokenSuccess) tokenErrors.add(1);

  // Randomised think time (1–3s) simulating user reviewing cart
  sleep(Math.random() * 2 + 1);

  // ─── Step 2: Submit payment (only if token succeeded) ───────────────────────
  if (tokenSuccess) {
    const paymentPayload = JSON.stringify({
      nonce: 'fake-valid-nonce',
      // MongoDB requires a 24-character hex ObjectId; using a valid dummy ID
      cart: [{ _id: '64b6e5e8e815ea7bfdb3c3f3', price: 100 }]
    });

    const paymentParams = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      tags: { endpoint: 'braintree-payment' },
    };

    const paymentRes = http.post(`${BASE_URL}/product/braintree/payment`, paymentPayload, paymentParams);

    paymentLatency.add(paymentRes.timings.duration);

    const paymentPassed = check(paymentRes, {
      'Payment succeeded (200)': (r) => r.status === 200,
    });

    // Track specific failure modes separately for richer diagnostics
    check(paymentRes, {
      'No server error (not 500)': (r) => r.status !== 500,
      'Not rate-limited (not 429)': (r) => r.status !== 429,
    });

    if (paymentRes.status >= 400) paymentErrors.add(1);
    checkoutSuccessRate.add(paymentPassed ? 1 : 0);
  } else {
    // Token failed — entire checkout journey failed
    checkoutSuccessRate.add(0);
    check(tokenRes, {
      'Checkout journey failed at token stage': () => false,
    });
  }

  sleep(1);
}

// ─── Structured output for report statistics ──────────────────────────────────
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './tests/spike/results/checkout-payment-results.json': JSON.stringify(data, null, 2),
  };
}
