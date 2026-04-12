// Leroy Chiu, A0273083E

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const browseLatency = new Trend('browse_latency', true);
const browseErrors = new Counter('browse_errors');


export const options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '4m', target: 50 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.05'],
        browse_latency: ['p(95)<500'],
    },
};

const BASE_URL = 'http://localhost:6060/api/v1';

export default function () {
    const responses = http.batch({
        categories: `${BASE_URL}/category/get-category`,
        productList: `${BASE_URL}/product/product-list/1`,
        productCount: `${BASE_URL}/product/product-count`,
    });

    const maxLatency = Math.max(
        responses.categories.timings.duration,
        responses.productList.timings.duration,
        responses.productCount.timings.duration
    );

    browseLatency.add(maxLatency);

    const passed = check(responses.productList, {
        'browse success (200)': (r) => r.status === 200,
    });

    if (!passed) browseErrors.add(1);

    sleep(1);
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
        './tests/load/results/browse-load.json': JSON.stringify(data, null, 2),
    };
}