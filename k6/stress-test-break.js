import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const registeredUsers = new Counter("registered_users");

// Aggressive test designed to break 0.25 CPU / 128M app + 0.25 CPU / 256M mongo (maxConns=20)
export const options = {
  stages: [
    { duration: "5s", target: 30 },    // Quick ramp
    { duration: "10s", target: 100 },   // Overwhelm
    { duration: "20s", target: 200 },   // Crush
    { duration: "15s", target: 200 },   // Sustain
    { duration: "10s", target: 0 },     // Cool down
  ],
  thresholds: {},
  // Short HTTP timeout so k6 doesn't hang — forces errors to surface fast
  httpTimeout: "5s",
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const API = `${BASE_URL}/api/v1`;
const jsonHeaders = { "Content-Type": "application/json" };

function testEmail(vuId, iter) {
  return `k6_break_vu${vuId}_i${iter}@test.com`;
}

function trackResponse(response, name) {
  responseTime.add(response.timings.duration);
  const failed = response.status === 0 || response.status >= 400;
  errorRate.add(failed);
  check(response, {
    [`${name}: status OK`]: (r) => r.status >= 200 && r.status < 400,
  });
}

export default function () {
  const vuId = __VU;
  const iter = __ITER;
  const email = testEmail(vuId, iter);
  const password = "K6StressTest123!";
  let token = null;

  // Step 1: Register — heavy DB write + password hashing (CPU-bound)
  group("01 - Register", () => {
    const res = http.post(
      `${API}/auth/register`,
      JSON.stringify({
        name: `Break Test ${vuId}-${iter}`,
        email,
        password,
        phone: "1234567890",
        address: "123 Break Test Lane",
        answer: "break-test",
      }),
      { headers: jsonHeaders, timeout: "15s" }
    );
    trackResponse(res, "Register");
    if (res.status === 200 || res.status === 201) registeredUsers.add(1);
  });

  // Step 2: Login — password compare is CPU-bound (bcrypt)
  group("02 - Login", () => {
    const res = http.post(
      `${API}/auth/login`,
      JSON.stringify({ email, password }),
      { headers: jsonHeaders, timeout: "15s" }
    );
    trackResponse(res, "Login");
    try {
      const body = JSON.parse(res.body);
      if (body.token) token = body.token;
    } catch (_) {}
  });

  // Step 3: Burst of parallel reads — exhausts mongo connections
  group("03 - Parallel Read Burst", () => {
    const responses = http.batch([
      ["GET", `${API}/category/get-category`, null, { timeout: "15s" }],
      ["GET", `${API}/product/product-count`, null, { timeout: "15s" }],
      ["GET", `${API}/product/product-list/1`, null, { timeout: "15s" }],
      ["GET", `${API}/product/product-list/2`, null, { timeout: "15s" }],
      ["GET", `${API}/product/product-list/3`, null, { timeout: "15s" }],
      ["GET", `${API}/product/search/laptop`, null, { timeout: "15s" }],
      ["GET", `${API}/product/search/phone`, null, { timeout: "15s" }],
      ["GET", `${API}/product/search/shirt`, null, { timeout: "15s" }],
    ]);
    responses.forEach((r, i) => trackResponse(r, `Batch Read ${i}`));
  });

  // Step 4: All filter combos at once — heavy DB scans
  group("04 - Filter Storm", () => {
    const ranges = [[0, 19], [20, 39], [40, 59], [60, 79], [80, 99], [100, 9999]];
    const responses = http.batch(
      ranges.map((range) => [
        "POST",
        `${API}/product/product-filters`,
        JSON.stringify({ checked: [], radio: range }),
        { headers: jsonHeaders, timeout: "15s" },
      ])
    );
    responses.forEach((r, i) => trackResponse(r, `Filter ${i}`));
  });

  // Step 5: Another read burst to keep connections saturated
  group("05 - Second Read Burst", () => {
    const responses = http.batch([
      ["GET", `${API}/product/product-list/1`, null, { timeout: "15s" }],
      ["GET", `${API}/product/product-list/2`, null, { timeout: "15s" }],
      ["GET", `${API}/product/search/book`, null, { timeout: "15s" }],
      ["GET", `${API}/product/search/shoe`, null, { timeout: "15s" }],
      ["GET", `${API}/product/search/test`, null, { timeout: "15s" }],
      ["GET", `${API}/product/product-count`, null, { timeout: "15s" }],
    ]);
    responses.forEach((r, i) => trackResponse(r, `Read Burst 2 ${i}`));
  });

  // Step 6: Auth-gated requests
  if (token) {
    group("06 - Auth Requests", () => {
      const responses = http.batch([
        ["GET", `${API}/auth/user-auth`, null, { headers: { Authorization: token }, timeout: "15s" }],
        ["GET", `${API}/auth/orders`, null, { headers: { Authorization: token }, timeout: "15s" }],
      ]);
      responses.forEach((r, i) => trackResponse(r, `Auth ${i}`));
    });
  }

  // Tiny pause — just enough to not be a pure spin loop
  sleep(0.05);
}

export function setup() {
  const res = http.get(BASE_URL, { timeout: "10s" });
  check(res, { "server is reachable": (r) => r.status === 200 });
  console.log("=== BREAK TEST ===");
  console.log("App: 0.25 CPU / 128M RAM | MongoDB: 0.25 CPU / 256M RAM / maxConns=20");
  console.log("Expect: 5xx errors, connection refused, OOM kills, timeout storms");
  return {};
}

export function teardown(data) {
  console.log("Break test completed.");
  console.log("=== CLEANUP ===");
  console.log(
    '  mongosh ecommerce --eval \'db.users.deleteMany({email: /^k6_break_vu.*@test\\.com$/})\''
  );
}
