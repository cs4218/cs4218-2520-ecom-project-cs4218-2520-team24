// Leroy Chiu, A0273083E

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// ─── Metrics ─────────────────────────────────────────────────────────────────
const browseLatency   = new Trend('browse_latency', true);
const browseErrors    = new Counter('browse_errors');
const loginLatency    = new Trend('login_latency', true);
const loginErrors     = new Counter('login_errors');
const loginSuccessRate = new Rate('login_success_rate');
const paymentLatency  = new Trend('payment_latency', true);
const paymentErrors   = new Counter('payment_errors');
const checkoutSuccessRate = new Rate('checkout_success_rate');

const BASE_URL = 'http://localhost:6060/api/v1';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ─── Options ─────────────────────────────────────────────────────────────────
// Total VUs: 100 → 70 browse, 20 auth, 10 checkout
export const options = {
    scenarios: {
        browsing: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 70 },
                { duration: '4m', target: 70 },
                { duration: '1m', target: 0 },
            ],
            gracefulRampDown: '30s',
            exec: 'browseScenario',
        },
        authenticating: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 20 },
                { duration: '4m', target: 20 },
                { duration: '1m', target: 0 },
            ],
            gracefulRampDown: '30s',
            exec: 'authScenario',
        },
        checkout: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 10 },
                { duration: '4m', target: 10 },
                { duration: '1m', target: 0 },
            ],
            gracefulRampDown: '30s',
            exec: 'checkoutScenario',
        },
    },
    thresholds: {
        http_req_failed:      ['rate<0.05'],
        login_success_rate:   ['rate>0.9'],
        payment_latency:      ['p(95)<1500'],
        checkout_success_rate: ['rate>0.95'],
    },
};

// ─── Setup: create checkout users ────────────────────────────────────────────
export function setup() {
    const tokens = [];
    const NUM_USERS = 5;

    for (let i = 0; i < NUM_USERS; i++) {
        const email = `mixed_user_${i}_${Date.now()}@example.com`;
        const password = 'password';

        http.post(`${BASE_URL}/auth/register`, JSON.stringify({
            name: `Mixed User ${i}`,
            email,
            password,
            phone: '12345678',
            address: '123 load road',
            answer: 'load',
        }), { headers: JSON_HEADERS });

        const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
            email,
            password,
        }), { headers: JSON_HEADERS });

        const token = loginRes.json('token');
        if (token) tokens.push(token);
    }

    if (tokens.length === 0) {
        throw new Error('No valid tokens created for checkout scenario');
    }

    return { tokens };
}

// ─── Scenario: Browse (70%) ───────────────────────────────────────────────────
export function browseScenario() {
    const responses = http.batch({
        categories:   `${BASE_URL}/category/get-category`,
        productList:  `${BASE_URL}/product/product-list/1`,
        productCount: `${BASE_URL}/product/product-count`,
    });

    const maxLatency = Math.max(
        responses.categories.timings.duration,
        responses.productList.timings.duration,
        responses.productCount.timings.duration,
    );

    browseLatency.add(maxLatency);

    const passed = check(responses.productList, {
        'browse success (200)': (r) => r.status === 200,
    });

    if (!passed) browseErrors.add(1);

    sleep(1);
}

// ─── Scenario: Auth (20%) ────────────────────────────────────────────────────
export function authScenario() {
    const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email: 'a@a.com', password: 'password' }),
        { headers: JSON_HEADERS }
    );

    loginLatency.add(res.timings.duration);

    const success = check(res, {
        'login success (200)': (r) => r.status === 200,
    });

    loginSuccessRate.add(success ? 1 : 0);
    if (!success) loginErrors.add(1);

    sleep(1);
}

// ─── Scenario: Checkout (10%) ────────────────────────────────────────────────
export function checkoutScenario(data) {
    const authToken = data.tokens[__VU % data.tokens.length];

    // Step 1: get Braintree token
    const tokenRes = http.get(`${BASE_URL}/product/braintree/token`);
    const tokenSuccess = check(tokenRes, {
        'braintree token OK': (r) => r.status === 200,
    });

    sleep(1);

    if (!tokenSuccess) {
        paymentErrors.add(1);
        return;
    }

    // Step 2: payment
    const paymentRes = http.post(
        `${BASE_URL}/product/braintree/payment`,
        JSON.stringify({
            nonce: 'fake-valid-nonce',
            cart: [{ _id: '66db427fdb0119d9234b27f3', price: 1499.99, quantity: 1 }],
        }),
        {
            headers: {
                ...JSON_HEADERS,
                Authorization: authToken,
            },
        }
    );

    paymentLatency.add(paymentRes.timings.duration);

    const success = check(paymentRes, {
        'payment goes through': (r) => r.status !== 0,
        'payment has no error': (r) => r.status !== 500,
    });

    checkoutSuccessRate.add(success ? 1 : 0);
    if (!success) paymentErrors.add(1);

    sleep(1);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
export function handleSummary(data) {
    return {
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
        './tests/load/results/mixed-load.json': JSON.stringify(data, null, 2),
    };
}