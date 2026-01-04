import http from 'k6/http';
import { sleep, check } from 'k6';

// ========================
// K6 Options
// ========================
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
  scenarios: {
    login: {
      executor: 'ramping-vus',
      exec: 'loginScenario',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
    browseProducts: {
      executor: 'ramping-vus',
      exec: 'browseProductsScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
    },
    checkout: {
      executor: 'ramping-vus',
      exec: 'checkoutScenario',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
    inventoryUpdate: {
      executor: 'ramping-vus',
      exec: 'inventoryScenario',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
};

// ========================
// Scenario Functions
// ========================

export function loginScenario() {
  const payload = JSON.stringify({
    email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    password: 'password123',
  });
  const res = http.post('http://localhost:5000/api/auth/login', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'login status 200': (r) => r.status === 200,
  });
  sleep(1);
}

export function browseProductsScenario() {
  const res = http.get('http://localhost:5000/api/products?page=1&limit=10');
  check(res, {
    'browse status 200': (r) => r.status === 200,
  });
  sleep(1);
}

export function checkoutScenario() {
  const cartPayload = JSON.stringify({
    items: [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ],
  });
  const headers = { 'Content-Type': 'application/json' };

  const addCart = http.post('http://localhost:5000/api/cart', cartPayload, { headers });
  check(addCart, { 'cart created': (r) => r.status === 200 });

  const checkout = http.post('http://localhost:5000/api/checkout', null, { headers });
  check(checkout, { 'checkout success': (r) => r.status === 200 });
  sleep(2);
}

export function inventoryScenario() {
  const payload = JSON.stringify({
    productId: Math.floor(Math.random() * 100),
    stock: Math.floor(Math.random() * 100),
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer YOUR_ADMIN_TOKEN',
  };

  const res = http.put('http://localhost:5000/api/inventory', payload, { headers });
  check(res, { 'inventory updated': (r) => r.status === 200 });
  sleep(1);
}
