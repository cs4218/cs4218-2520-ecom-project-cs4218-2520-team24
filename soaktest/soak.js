import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  scenarios: {
    soakBrowseSearch: {
      executor: "constant-vus",
      exec: "soakBrowseSearch",
      vus: 100,
      duration: "2h",
    },
    soakCartishFlow: {
      executor: "constant-vus",
      exec: "soakCartishFlow",
      vus: 100,
      duration: "2h",
    },
    soakCheckout: {
      executor: "constant-vus",
      exec: "soakCheckout",
      vus: 100,
      duration: "2h",
    },
    soakAdminOps: {
      executor: "constant-vus",
      exec: "soakAdminOps",
      vus: 100,
      duration: "2h",
    },
    soakAuthProfile: {
      executor: "constant-vus",
      exec: "soakAuthProfile",
      vus: 100,
      duration: "2h",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:6060/api/v1";
const USER_EMAIL = __ENV.USER_EMAIL || "user@example.com";
const USER_PASS = __ENV.USER_PASS || "password";
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASS = __ENV.ADMIN_PASS || "password";

function login(email, password) {
  const res = http.post(`${BASE}/auth/login`, JSON.stringify({ email, password }), {
    headers: { "Content-Type": "application/json" },
  });
  check(res, { "login ok": (r) => r.status === 200 });
  const body = res.json();
  return body?.token;
}

function getCategories() {
  const res = http.get(`${BASE}/category/get-category`);
  check(res, { "categories ok": (r) => r.status === 200 });
  const body = res.json();
  return body?.category || [];
}

function getProducts(page = 1) {
  const res = http.get(`${BASE}/product/product-list/${page}`);
  check(res, { "product list ok": (r) => r.status === 200 });
  const body = res.json();
  return body?.products || [];
}

export function soakBrowseSearch() {
  const cats = getCategories();
  const products = getProducts(1);
  if (cats.length) {
    http.get(`${BASE}/category/single-category/${cats[0].slug}`);
    http.get(`${BASE}/product/product-category/${cats[0].slug}`);
  }
  if (products.length) {
    http.get(`${BASE}/product/get-product/${products[0].slug}`);
    http.get(`${BASE}/product/product-photo/${products[0]._id}`);
  }
  http.get(`${BASE}/product/search/laptop`);
  http.post(
    `${BASE}/product/product-filters`,
    JSON.stringify({ checked: [], radio: [] }),
    { headers: { "Content-Type": "application/json" } }
  );
  sleep(2);
}

export function soakCartishFlow() {
  const products = getProducts(1);
  if (products.length) {
    http.get(`${BASE}/product/get-product/${products[0].slug}`);
    http.get(
      `${BASE}/product/related-product/${products[0]._id}/${products[0].category?._id || ""}`
    );
  }
  sleep(2);
}

export function soakCheckout() {
  const token = login(USER_EMAIL, USER_PASS);
  if (!token) return;

  const bt = http.get(`${BASE}/product/braintree/token`, {
    headers: { Authorization: token },
  });
  check(bt, { "braintree token ok": (r) => r.status === 200 });

  const payRes = http.post(
    `${BASE}/product/braintree/payment`,
    JSON.stringify({ cart: [], nonce: "fake-valid-nonce" }),
    { headers: { "Content-Type": "application/json", Authorization: token } }
  );
  check(payRes, { "payment response": (r) => r.status === 200 || r.status === 400 });
  sleep(3);
}

export function soakAdminOps() {
  const token = login(ADMIN_EMAIL, ADMIN_PASS);
  if (!token) return;

  const name = `SoakCat-${Date.now()}`;
  const create = http.post(
    `${BASE}/category/create-category`,
    JSON.stringify({ name }),
    { headers: { "Content-Type": "application/json", Authorization: token } }
  );
  check(create, { "create category ok": (r) => r.status === 201 || r.status === 200 });
  sleep(2);
}

export function soakAuthProfile() {
  const token = login(USER_EMAIL, USER_PASS);
  if (!token) return;

  http.get(`${BASE}/auth/user-auth`, { headers: { Authorization: token } });
  http.get(`${BASE}/auth/orders`, { headers: { Authorization: token } });
  http.put(
    `${BASE}/auth/profile`,
    JSON.stringify({ name: "Soak User" }),
    { headers: { "Content-Type": "application/json", Authorization: token } }
  );
  sleep(2);
}
