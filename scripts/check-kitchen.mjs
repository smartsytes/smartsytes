/**
 * Exercises the kitchen screen API: password login, signed cookie, order list,
 * status changes, expiry, forged cookies and brute-force throttling.
 *
 * The Stripe event is signed for real, so an order arrives the same way it
 * would in production.
 */
import worker from "../deploy-worker.js";

const SECRET = "whsec_test_secret";
const PASSWORD = "hush-hush-kitchen";
const encoder = new TextEncoder();

class FakeDB {
  constructor() {
    this.rows = new Map();
    this.statements = [];
  }

  prepare(query) {
    const sql = query.replace(/\s+/g, " ").trim();
    this.statements.push(sql);
    const db = this;

    const execute = (args) => {
      if (sql.startsWith("CREATE TABLE") || sql.startsWith("ALTER TABLE")) {
        return { meta: { changes: 0 } };
      }
      if (sql.startsWith("INSERT INTO orders")) {
        const id = String(args[0]);
        if (db.rows.has(id)) return { meta: { changes: 0 } };
        db.rows.set(id, {
          session_id: id,
          order_id: args[1],
          created_at: args[2],
          amount_total: args[3],
          currency: args[4],
          status: args[5],
          fulfillment: args[6],
          customer_name: args[7],
          phone: args[8],
          email: args[9],
          requested_for: args[10],
          notes: args[11],
          address: args[12],
          items: args[13],
          notified: args[14],
          kitchen_status: "new",
          updated_at: args[2],
        });
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith("UPDATE orders SET kitchen_status")) {
        const [status, updatedAt, id] = args;
        const row = db.rows.get(String(id));
        if (!row) return { meta: { changes: 0 } };
        db.rows.set(String(id), { ...row, kitchen_status: status, updated_at: updatedAt });
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith("UPDATE orders SET notified")) {
        const [notified, customerNotified, id] = args;
        const row = db.rows.get(String(id));
        if (!row) return { meta: { changes: 0 } };
        db.rows.set(String(id), { ...row, notified, customer_notified: customerNotified });
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith("SELECT") && sql.includes("WHERE session_id = ?")) {
        const row = db.rows.get(String(args[0]));
        return { meta: { changes: 0 }, results: row ? [row] : [] };
      }
      if (sql.startsWith("SELECT") && sql.includes("FROM orders")) {
        const results = [...db.rows.values()]
          .sort((a, b) => Number(b.created_at) - Number(a.created_at))
          .slice(0, Number(args[0]) || 50);
        return { meta: { changes: 0 }, results };
      }
      return { meta: { changes: 0 } };
    };

    const bound = (args) => ({
      run: async () => execute(args),
      all: async () => execute(args),
      first: async () => execute(args).results?.[0] ?? null,
    });

    return {
      bind: (...args) => bound(args),
      run: async () => execute([]),
      all: async () => execute([]),
      first: async () => execute([]).results?.[0] ?? null,
    };
  }
}

const results = [];
const check = (label, pass, detail = "") =>
  results.push({ label, pass: Boolean(pass), detail });

const makeEnv = (overrides = {}) => ({
  APP_ORIGIN: "https://example.test",
  KITCHEN_PASSWORD: PASSWORD,
  STRIPE_WEBHOOK_SECRET: SECRET,
  DB: new FakeDB(),
  ASSETS: { fetch: async () => new Response("{}") },
  ...overrides,
});

const cookieFrom = (response) => {
  const header = response.headers.get("set-cookie") ?? "";
  return header.split(";")[0] ?? "";
};

const call = (env, path, init = {}) =>
  worker.fetch(new Request(`https://example.test${path}`, init), env);

const login = (env, password, ip = "203.0.113.9") =>
  call(env, "/api/kitchen/login", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ password }),
  });

async function stripeSignature(body, secret = SECRET, timestamp) {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${t}.${body}`));
  const v1 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `t=${t},v1=${v1}`;
}

async function deliverPaidOrder(env, sessionId = "cs_test_kitchen_1", orderId = "DQ-KIT01") {
  const body = JSON.stringify({
    id: `evt_${sessionId}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        payment_status: "paid",
        amount_total: 4218,
        currency: "usd",
        client_reference_id: orderId,
        customer_details: { email: "ada@example.com" },
        metadata: {
          fulfillment: "pickup",
          customer_name: "Ada Lovelace",
          phone: "(972) 555-0134",
          when: "12:30 PM",
          notes: "Extra napkins",
        },
        line_items: {
          data: [{ description: "Oxtail Pasta", quantity: 1, amount_total: 4218 }],
        },
      },
    },
  });

  return call(env, "/api/stripe/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": await stripeSignature(body) },
    body,
  });
}

// 1. Not configured
let env = makeEnv({ KITCHEN_PASSWORD: "" });
let response = await call(env, "/api/kitchen/session");
let payload = await response.json();
check("reports the screen as unconfigured", payload.configured === false && payload.authenticated === false);
check("login refuses without a password set", (await login(env, "x")).status === 503);
check("orders refuse without a password set", (await call(env, "/api/kitchen/orders")).status === 503);

// 2. Signed out
env = makeEnv();
payload = await (await call(env, "/api/kitchen/session")).json();
check("starts signed out", payload.configured === true && payload.authenticated === false);
check("orders need a session", (await call(env, "/api/kitchen/orders")).status === 401);

// 3. Login
response = await login(env, "wrong-password", "198.51.100.7");
check("rejects a wrong password", response.status === 401, `status ${response.status}`);

response = await login(env, PASSWORD, "198.51.100.8");
const setCookie = response.headers.get("set-cookie") ?? "";
check("accepts the right password", response.status === 200, `status ${response.status}`);
check("cookie is HttpOnly and SameSite=Strict", /HttpOnly/.test(setCookie) && /SameSite=Strict/.test(setCookie));
check("cookie is scoped to the site", /Path=\//.test(setCookie) && /Max-Age=43200/.test(setCookie));

const cookie = cookieFrom(response);
const authHeaders = { cookie };

// 4. Empty board
response = await call(env, "/api/kitchen/orders", { headers: authHeaders });
payload = await response.json();
check("lists an empty board", response.status === 200 && payload.orders.length === 0);

// 5. A paid order reaches the board
check("webhook stores the order", (await deliverPaidOrder(env)).status === 200);
payload = await (await call(env, "/api/kitchen/orders", { headers: authHeaders })).json();
check("shows the paid order", payload.orders.length === 1, `orders ${payload.orders.length}`);
check("starts in the new column", payload.orders[0]?.kitchen_status === "new");
check(
  "carries the details staff need",
  payload.orders[0]?.order_id === "DQ-KIT01" &&
    payload.orders[0]?.customer_name === "Ada Lovelace" &&
    payload.orders[0]?.notes === "Extra napkins" &&
    payload.orders[0]?.items?.[0]?.name === "Oxtail Pasta",
);

// 6. Status changes
const postStatus = (body, headers = {}) =>
  call(env, "/api/kitchen/orders/status", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

response = await postStatus({ sessionId: "cs_test_kitchen_1", status: "started" }, authHeaders);
check("marks an order started", response.status === 200, `status ${response.status}`);
payload = await (await call(env, "/api/kitchen/orders", { headers: authHeaders })).json();
check("persists the started status", payload.orders[0]?.kitchen_status === "started");

response = await postStatus({ sessionId: "cs_test_kitchen_1", status: "completed" }, authHeaders);
check("marks an order completed", response.status === 200);

response = await postStatus({ sessionId: "cs_test_kitchen_1", status: "burned" }, authHeaders);
check("rejects an unknown status", response.status === 400);

response = await postStatus({ sessionId: "cs_missing", status: "started" }, authHeaders);
check("reports a missing order", response.status === 404);

check(
  "status changes need a session",
  (await postStatus({ sessionId: "cs_test_kitchen_1", status: "new" })).status === 401,
);

// 6b. Single-order lookup for the printable ticket
const ticket = (query, headers = {}) => call(env, `/api/kitchen/order${query}`, { headers });

check("a ticket needs a session", (await ticket("?sessionId=cs_test_kitchen_1")).status === 401);

response = await ticket("?sessionId=cs_test_kitchen_1", authHeaders);
payload = await response.json();
check(
  "a ticket returns the order and its items",
  response.status === 200 &&
    payload.order?.order_id === "DQ-KIT01" &&
    payload.order?.items?.[0]?.name === "Oxtail Pasta",
  `status ${response.status}`,
);
check(
  "a ticket carries the details printed on paper",
  payload.order?.customer_name === "Ada Lovelace" &&
    payload.order?.phone === "(972) 555-0134" &&
    payload.order?.notes === "Extra napkins" &&
    payload.order?.amount_total === 4218,
);

check("a ticket without an id is rejected", (await ticket("", authHeaders)).status === 400);
check("an unknown ticket is a 404", (await ticket("?sessionId=cs_nope", authHeaders)).status === 404);

// 7. Forged and expired cookies
const [expiry, signature] = cookie.replace("daq_kitchen=", "").split(".");
const forged = `daq_kitchen=${expiry}.${signature.replace(/^./, (c) => (c === "a" ? "b" : "a"))}`;
check(
  "rejects a forged cookie",
  (await call(env, "/api/kitchen/orders", { headers: { cookie: forged } })).status === 401,
);

const expiredAt = Date.now() - 1000;
const expiredToken = `${expiredAt}.${await (async () => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(PASSWORD),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`kitchen:${expiredAt}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
})()}`;
check(
  "rejects an expired session",
  (await call(env, "/api/kitchen/orders", { headers: { cookie: `daq_kitchen=${expiredToken}` } })).status === 401,
);

// 8. Cross-origin writes
response = await call(env, "/api/kitchen/orders/status", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://evil.test", ...authHeaders },
  body: JSON.stringify({ sessionId: "cs_test_kitchen_1", status: "new" }),
});
check("refuses cross-origin changes", response.status === 403, `status ${response.status}`);

// 9. Brute force throttle
let throttled = 0;
for (let attempt = 0; attempt < 7; attempt += 1) {
  const result = await login(env, `guess-${attempt}`, "192.0.2.55");
  if (result.status === 429) throttled += 1;
}
check("throttles repeated guesses", throttled > 0, `429s: ${throttled}`);

// 10. Logout clears the cookie
response = await call(env, "/api/kitchen/logout", {
  method: "POST",
  headers: { origin: "https://example.test", ...authHeaders },
});
check(
  "logout clears the cookie",
  response.status === 200 && /Max-Age=0/.test(response.headers.get("set-cookie") ?? ""),
);

let failed = 0;
for (const result of results) {
  if (!result.pass) failed += 1;
  console.log(`${result.pass ? "pass" : "FAIL"}  ${result.label}${result.detail ? `  (${result.detail})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
