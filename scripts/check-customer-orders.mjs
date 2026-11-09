/**
 * Exercises the customer self-service flow: the signed link in the receipt,
 * the public order lookup, rescheduling and a real Stripe refund on cancel.
 *
 * Stripe and Resend are stubbed; the webhook signature is real, so the order
 * arrives exactly the way it does in production.
 */
import { createHmac } from "node:crypto";
import worker from "../deploy-worker.js";

const SECRET = "whsec_test_secret";
const ORIGIN = "https://daqs.example";
const encoder = new TextEncoder();

let failures = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    console.log(`pass  ${name}${detail ? `  (${detail})` : ""}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `  (${detail})` : ""}`);
  }
};

class FakeDB {
  constructor() {
    this.rows = new Map();
  }

  prepare(query) {
    const sql = query.replace(/\s+/g, " ").trim();
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
          customer_notified: null,
          kitchen_status: "new",
          updated_at: args[2],
          cancelled_at: null,
          reschedule_count: 0,
        });
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith("UPDATE orders SET notified")) {
        const [notified, customerNotified, id] = args;
        const row = db.rows.get(String(id));
        if (!row) return { meta: { changes: 0 } };
        db.rows.set(String(id), { ...row, notified, customer_notified: customerNotified });
        return { meta: { changes: 1 } };
      }
      if (sql.includes("SET requested_for")) {
        const [label, updatedAt, id] = args;
        const row = db.rows.get(String(id));
        if (!row) return { meta: { changes: 0 } };
        db.rows.set(String(id), {
          ...row,
          requested_for: label,
          updated_at: updatedAt,
          reschedule_count: (row.reschedule_count || 0) + 1,
        });
        return { meta: { changes: 1 } };
      }
      if (sql.includes("SET status = 'refunded'")) {
        const [updatedAt, cancelledAt, id] = args;
        const row = db.rows.get(String(id));
        if (!row) return { meta: { changes: 0 } };
        db.rows.set(String(id), {
          ...row,
          status: "refunded",
          kitchen_status: "cancelled",
          updated_at: updatedAt,
          cancelled_at: cancelledAt,
        });
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith("SELECT") && sql.includes("WHERE session_id = ?")) {
        const row = db.rows.get(String(args[0]));
        return { meta: { changes: 0 }, results: row ? [row] : [] };
      }
      if (sql.startsWith("SELECT") && sql.includes("FROM orders")) {
        return { meta: { changes: 0 }, results: [...db.rows.values()] };
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

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const makeEnv = (overrides = {}) => ({
  DB: new FakeDB(),
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: SECRET,
  RESEND_API_KEY: "re_test_123",
  KITCHEN_EMAIL: "kitchen@example.com",
  APP_ORIGIN: ORIGIN,
  ...overrides,
});

let emails = [];
let stripe = [];
let failRefund = false;

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);

  if (url.startsWith("https://api.stripe.com/v1/checkout/sessions/")) {
    stripe.push({ path: "session", url });
    if (failRefund) return jsonResponse({ error: { message: "no payment intent" } }, 404);
    return jsonResponse({ id: "cs_1", payment_intent: "pi_test_1" });
  }

  if (url.startsWith("https://api.stripe.com/v1/refunds")) {
    stripe.push({
      path: "refund",
      body: String(init.body ?? ""),
      idempotency: init.headers?.["idempotency-key"],
    });
    if (failRefund) return jsonResponse({ error: { message: "card expired" } }, 400);
    return jsonResponse({ id: "re_test_1", amount: 7417 });
  }

  if (url.startsWith("https://api.resend.com/emails")) {
    emails.push(JSON.parse(String(init.body ?? "{}")));
    return jsonResponse({ id: `em_${emails.length}` });
  }

  throw new Error(`unexpected fetch: ${url}`);
};

const OPEN = {
  Tuesday: [12, 21],
  Wednesday: [12, 21],
  Thursday: [12, 21],
  Friday: [12, 22],
  Saturday: [12, 22],
  Sunday: [12, 20],
};

const chicago = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "Sunday",
    minutes:
      Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
      Number(parts.find((part) => part.type === "minute")?.value ?? 0),
  };
};

/** Finds a future instant matching a predicate on its Central wall clock. */
const findSlot = (predicate) => {
  for (let step = 8; step < 2000; step += 1) {
    const candidate = new Date(Date.now() + step * 30 * 60 * 1000);
    const { weekday, minutes } = chicago(candidate);
    if (predicate(minutes, weekday)) return candidate;
  }
  throw new Error("no matching slot found");
};

const tokenFor = (sessionId) =>
  createHmac("sha256", SECRET).update(`order-link:${sessionId}`).digest("hex").slice(0, 40);

const sign = async (body) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = [
    ...new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`))),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${digest}`;
};

const request = (env, path, { method = "GET", body, headers = {} } = {}) =>
  worker.fetch(
    new Request(`${ORIGIN}${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );

const deliver = async (env, session) => {
  const raw = JSON.stringify({
    id: "evt_manage_1",
    type: "checkout.session.completed",
    data: { object: session },
  });
  return worker.fetch(
    new Request(`${ORIGIN}/api/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": await sign(raw) },
      body: raw,
    }),
    env,
  );
};

const session = (overrides = {}) => ({
  id: "cs_manage_1",
  payment_status: "paid",
  amount_total: 7417,
  currency: "usd",
  client_reference_id: "DQ-MAN01",
  customer_details: { email: "ada@example.com", name: "Ada Lovelace", phone: "+19725550134" },
  metadata: {
    fulfillment: "pickup",
    customer_name: "Ada Lovelace",
    phone: "+19725550134",
    when: "Friday 6:30 PM",
    notes: "Extra napkins",
  },
  line_items: {
    data: [
      { description: "Oxtail Pasta", quantity: 2, amount_total: 5200 },
      { description: "Frozen Daq", quantity: 1, amount_total: 1200 },
    ],
  },
  ...overrides,
});

const env = makeEnv();
const id = "cs_manage_1";
const token = tokenFor(id);

// 1. The receipt carries a working, signed link.
emails = [];
await deliver(env, session());
const receipt = emails.find((mail) => String(mail.to).includes("ada@example.com"));
const link = String(receipt?.text ?? "").match(/https:\/\/daqs\.example\/order\/\S+/)?.[0] ?? "";
check("customer receipt links to the management page", link === `${ORIGIN}/order/${id}?t=${token}`);
check("receipt link is on its own labelled line", String(receipt?.text ?? "").includes("Reschedule or cancel: https://"));
check("receipt HTML carries the link", String(receipt?.html ?? "").includes(`/order/${id}?t=${token}`));

// 2. Lookup needs the signature.
let response = await request(env, `/api/order?sessionId=${id}`);
check("a tokenless lookup is refused", response.status === 404);
response = await request(env, `/api/order?sessionId=${id}&t=${"0".repeat(40)}`);
check("a forged token is refused", response.status === 404);

response = await request(env, `/api/order?sessionId=${id}&t=${token}`);
let payload = await response.json();
check(
  "the link returns the order summary",
  response.status === 200 &&
    payload.order?.orderId === "DQ-MAN01" &&
    payload.order?.requestedFor === "Friday 6:30 PM" &&
    payload.order?.amountTotal === 7417,
  `status ${response.status}`,
);
check("the summary marks it as changeable", payload.order?.canChange === true);
check(
  "the summary hides contact and card details",
  !("email" in payload.order) && !("phone" in payload.order) && !("address" in payload.order),
);

// 3. Rescheduling.
const change = (body, headers = {}) =>
  request(env, "/api/order/reschedule", { method: "POST", body, headers });

response = await change({ sessionId: id, t: token, when: "not-a-date" });
check("an unreadable time is rejected", response.status === 400);

response = await change({ sessionId: id, t: token, when: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
check("a time inside 30 minutes is rejected", response.status === 400);

response = await change({
  sessionId: id,
  t: token,
  when: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
});
check("a time three weeks out is rejected", response.status === 400);

const closedSlot = findSlot((minutes) => minutes < 12 * 60 || minutes >= 22 * 60);
response = await change({ sessionId: id, t: token, when: closedSlot.toISOString() });
payload = await response.json();
check(
  "a time outside opening hours is rejected",
  response.status === 400 && payload.code === "closed",
  `${closedSlot.toISOString()} ${payload.error ?? ""}`.slice(0, 90),
);

const mondaySlot = findSlot((_minutes, weekday) => weekday === "Monday");
response = await change({ sessionId: id, t: token, when: mondaySlot.toISOString() });
check("a Monday pickup is rejected", response.status === 400, mondaySlot.toISOString());

const justBeforeOpen = findSlot((minutes, weekday) => {
  const window = OPEN[weekday];
  return Boolean(window) && minutes >= window[0] * 60 - 60 && minutes < window[0] * 60;
});
response = await change({ sessionId: id, t: token, when: justBeforeOpen.toISOString() });
check("a time an hour before opening is rejected", response.status === 400, justBeforeOpen.toISOString());

response = await change({ sessionId: id, t: token, when: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }, { origin: "https://evil.example" });
check("a cross-origin change is refused", response.status === 403);

emails = [];
const target = findSlot((minutes, weekday) => {
  const window = OPEN[weekday];
  return Boolean(window) && minutes >= window[0] * 60 && minutes < window[1] * 60;
});
response = await change({ sessionId: id, t: token, when: target.toISOString() });
payload = await response.json();
check(
  "a valid time is accepted",
  response.status === 200 && Boolean(payload.requestedFor),
  `status ${response.status} ${payload.requestedFor ?? ""}`,
);
check("the order now holds the new time", env.DB.rows.get(id)?.requested_for === payload.requestedFor);
check("the change is counted", env.DB.rows.get(id)?.reschedule_count === 1);
const kitchenMail = emails.find((mail) => String(mail.to).includes("kitchen@example.com"));
check("the kitchen is told about the move", String(kitchenMail?.subject ?? "").includes("moved"));
check(
  "the kitchen email shows the old and new time",
  String(kitchenMail?.text ?? "").includes("Friday 6:30 PM") &&
    String(kitchenMail?.text ?? "").includes(payload.requestedFor),
);
check("the customer is told about the move", emails.some((mail) => String(mail.to).includes("ada@example.com")));

// 4. Once the kitchen starts, the door closes.
env.DB.rows.get(id).kitchen_status = "started";
response = await change({ sessionId: id, t: token, when: new Date(Date.now() + 3600 * 1000).toISOString() });
check("a started order can't be moved", response.status === 409);
response = await request(env, "/api/order/cancel", { method: "POST", body: { sessionId: id, t: token } });
check("a started order can't be cancelled", response.status === 409);
env.DB.rows.get(id).kitchen_status = "new";

// 5. Cancelling refunds through Stripe.
stripe = [];
emails = [];
response = await request(env, "/api/order/cancel", { method: "POST", body: { sessionId: id, t: token } });
payload = await response.json();
check(
  "a cancel is accepted and reports the refund",
  response.status === 200 && payload.refunded === 7417,
  `status ${response.status}`,
);
const refund = stripe.find((call) => call.path === "refund");
check("Stripe is asked to refund the payment", String(refund?.body ?? "").includes("payment_intent=pi_test_1"));
check("the refund is idempotent per order", refund?.idempotency === `refund-${id}`);
check("the order is marked refunded", env.DB.rows.get(id)?.status === "refunded");
check("the board shows it cancelled", env.DB.rows.get(id)?.kitchen_status === "cancelled");
check("the cancellation is timestamped", typeof env.DB.rows.get(id)?.cancelled_at === "number");
const cancelMail = emails.find((mail) => String(mail.to).includes("kitchen@example.com"));
check("the kitchen is told to stop", String(cancelMail?.subject ?? "").includes("CANCELLED"));
check("the kitchen email says not to prepare it", String(cancelMail?.text ?? "").includes("Do not prepare"));
check("the customer gets a refund confirmation", emails.some((mail) => String(mail.subject ?? "").includes("cancelled")));

response = await request(env, "/api/order/cancel", { method: "POST", body: { sessionId: id, t: token } });
check("a cancelled order can't be cancelled again", response.status === 409);

// 6. Delivery stays with the kitchen.
await deliver(env, session({ id: "cs_manage_delivery", client_reference_id: "DQ-MAN02", metadata: { ...session().metadata, fulfillment: "delivery", address: "123 Preston Rd" } }));
response = await request(env, "/api/order/cancel", {
  method: "POST",
  body: { sessionId: "cs_manage_delivery", t: tokenFor("cs_manage_delivery") },
});
check("delivery orders can't be self-cancelled", response.status === 409);
check("the delivery order is untouched", env.DB.rows.get("cs_manage_delivery")?.status === "paid");

// 7. A failed refund never marks the order cancelled.
failRefund = true;
await deliver(env, session({ id: "cs_manage_fail", client_reference_id: "DQ-MAN03" }));
emails = [];
response = await request(env, "/api/order/cancel", {
  method: "POST",
  body: { sessionId: "cs_manage_fail", t: tokenFor("cs_manage_fail") },
});
payload = await response.json();
check("a refused refund is reported, not swallowed", response.status === 502 && Boolean(payload.error));
check("the refused order stays open", env.DB.rows.get("cs_manage_fail")?.kitchen_status === "new");
check("the refused order is not marked refunded", env.DB.rows.get("cs_manage_fail")?.status === "paid");

// 8. With no Stripe key the page says to call.
failRefund = false;
const brokeEnv = { ...env, STRIPE_SECRET_KEY: "" };
response = await request(brokeEnv, "/api/order/cancel", {
  method: "POST",
  body: { sessionId: "cs_manage_fail", t: tokenFor("cs_manage_fail") },
});
check("cancelling without Stripe points at the phone", response.status === 503);

console.log("");
console.log(failures === 0 ? "all customer order checks passed" : `${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
