// Leroy Chiu, A0273083E

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const paymentLatency = new Trend('payment_latency', true);
const paymentErrors = new Counter('payment_errors');
const successRate = new Rate('checkout_success_rate');

const BASE_URL = 'http://localhost:6060/api/v1';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
    stages: [
        { duration: '1m', target: 15 },
        { duration: '4m', target: 15 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_duration: ["p(95)<2000", "p(99)<4000"],
        http_req_failed: ['rate<0.05'],
        checkout_success_rate: ['rate>0.95'],
    },
};

export function setup() {
    const headers = { 'Content-Type': 'application/json' };
    const tokens = [];

    const NUM_USERS = 5; // keep small for checkout tests

    for (let i = 0; i < NUM_USERS; i++) {
        const email = `checkout_user_${i}_${Date.now()}@example.com`;
        const password = 'password';

        // register
        http.post(`${BASE_URL}/auth/register`, JSON.stringify({
            name: `User ${i}`,
            email,
            password,
            phone: '12345678',
            address: "123 load road",
            answer: "load"
        }), { headers });

        // login
        const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
            email,
            password,
        }), { headers });

        console.log(`Login status: ${loginRes.status}`);
        console.log(`Login body: ${loginRes.body}`);

        const token = loginRes.json('token');

        if (token) {
            tokens.push(token);
        }
    }

    if (tokens.length === 0) {
        throw new Error('No valid tokens created');
    }

    return { tokens };
}

export default function (data) {
    const authToken = data.tokens[__VU % data.tokens.length];

    // ─── STEP 1: get Braintree token ─────────────────────────
    const tokenRes = http.get(`${BASE_URL}/product/braintree/token`);

    const tokenSuccess = check(tokenRes, {
        'token OK': (r) => r.status === 200,
    });

    sleep(1);

    if (!tokenSuccess) {
        paymentErrors.add(1);
        return;
    }

    // ─── STEP 2: payment ─────────────────────────────────────
    const paymentRes = http.post(
        `${BASE_URL}/product/braintree/payment`,
        JSON.stringify({
            nonce: 'fake-valid-nonce',
            cart: [
                {
                    _id: '66db427fdb0119d9234b27f3',
                    price: 1499.99,
                    quantity: 1,
                },
            ],
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
        'payment success': (r) => r.status === 200,
    });

    successRate.add(success ? 1 : 0);

    if (!success) paymentErrors.add(1);

    sleep(1);
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
        './tests/load/results/checkout-load.json': JSON.stringify(data, null, 2),
    };
}