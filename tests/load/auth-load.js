// Leroy Chiu, A0273083E

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const loginLatency = new Trend('login_latency', true);
const loginErrors = new Counter('login_errors');
const loginSuccessRate = new Rate('login_success_rate');

export const options = {
    stages: [
        { duration: '1m', target: 30 },
        { duration: '4m', target: 30 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        login_latency: ['p(95)<800'],
        login_success_rate: ['rate>0.9'],
    },
};

const BASE_URL = 'http://localhost:6060/api/v1';
const JSON_HEADERS = {
    'Content-Type': 'application/json',
};

export default function () {
    const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: 'a@a.com',
            password: 'password',
        }),
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

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
        './tests/load/results/auth-load.json': JSON.stringify(data, null, 2),
    };
}