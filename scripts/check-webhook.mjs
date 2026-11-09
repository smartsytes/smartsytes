/**
 * Exercises the Stripe webhook without Stripe, D1, or an email account.
 *
 * Signatures are generated exactly the way Stripe generates them, so a broken
 * signature check shows up here rather than as silently dropped orders.
 */
import worker from "../deploy-worker.js";

const SECRET = "whsec_test_secret";
const encoder = new TextEncoder();

class FakeDB {
  constructor() {
    this.rows = new Map();
    this.statements = [];
  }

  prepare(query) {
    this.statements.push(query);
    const db = this;

    return {
      bind(...args) {
        return {
          run: async () => {
            if (query.startsWith("INSERT")) {
              const id = args[0];
              if (db.rows.has(id)) return { meta: { changes: 0 } };
              db.rows.set(id, args);
              return { meta: { changes: 1 } };
            }
            if (query.startsWith("UPDATE")) {
              const [notified, customerNotified, id] = args;
              const row = db.rows.get(id);
              if (!row) return { meta: { changes: 0 } };
              const next = [...row];
              next[14] = notified;
              next[15] = customerNotified;
              db.rows.set(id, next);
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          },
        };
      },
      run: async () => ({ meta: { changes: 0 } }),
    };
  }
}

const results = [];
const check = (label, pass, detail = "") =>
  results.push({ label, pass: Boolean(pass), detail });

async function sign(body, { secret = SECRET, timestamp } = {}) {
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

const session = {
  id: "cs_test_paid_123456",
  object: "checkout.session",
  payment_status: "paid",
  amount_total: 7417,
  currency: "usd",
  client_reference_id: "DQ-K4T2A",
  customer_details: { email: "ada@example.com", name: "Ada Lovelace" },
  metadata: {
    fulfillment: "delivery",
    customer_name: "Ada Lovelace",
    phone: "(972) 555-0134",
    when: "12:30 PM",
    notes: "Sauce <script>alert(1)</script> on the side",
    address: "123 Preston Rd, Plano, TX, 75024",
  },
  line_items: {
    data: [
      { description: "Oxtail Pasta", quantity: 2, amount_total: 6798 },
      { description: "Sales tax (8.25%)", quantity: 1, amount_total: 561 },
      { description: "Delivery", quantity: 1, amount_total: 499 },
    ],
  },
};

const eventBody = JSON.stringify({
  id: "evt_test_1",
  type: "checkout.session.completed",
  data: { object: session },
});

let emails = [];
let sms = [];

globalThis.fetch = async (url, init) => {
  const target = String(url);
  if (target.includes("api.resend.com")) {
    emails.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
  }
  if (target.includes("api.twilio.com")) {
    sms.push(String(init.body));
    return new Response(JSON.stringify({ sid: "SM1" }), { status: 200 });
  }
  return new Response("{}", { status: 200 });
};

const makeEnv = (overrides = {}) => ({
  STRIPE_WEBHOOK_SECRET: SECRET,
  RESEND_API_KEY: "re_test_key",
  KITCHEN_EMAIL: "kitchen@example.com,owner@example.com",
  ASSETS: { fetch: async () => new Response("{}") },
  DB: new FakeDB(),
  ...overrides,
});

const deliver = (body, signature, env) =>
  worker.fetch(
    new Request("https://example.test/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature, "content-type": "application/json" },
      body,
    }),
    env,
  );

// 1. Missing secret
let env = makeEnv({ STRIPE_WEBHOOK_SECRET: "" });
let response = await deliver(eventBody, await sign(eventBody), env);
check("refuses when no webhook secret is set", response.status === 503, `status ${response.status}`);

// 2. Tampered body
env = makeEnv();
const header = await sign(eventBody);
response = await deliver(eventBody.replace("7417", "1"), header, env);
check("rejects a tampered payload", response.status === 400, `status ${response.status}`);

// 3. Wrong secret
response = await deliver(eventBody, await sign(eventBody, { secret: "whsec_other" }), makeEnv());
check("rejects a wrong secret", response.status === 400, `status ${response.status}`);

// 4. Replayed/stale timestamp
const stale = Math.floor(Date.now() / 1000) - 3600;
response = await deliver(eventBody, await sign(eventBody, { timestamp: stale }), makeEnv());
check("rejects a stale signature", response.status === 400, `status ${response.status}`);

// 5. Happy path
env = makeEnv();
response = await deliver(eventBody, header, env);
let payload = await response.json();
check("accepts a valid delivery", response.status === 200 && payload.stored === true, JSON.stringify(payload));
check("stores one order row", env.DB.rows.size === 1, `rows ${env.DB.rows.size}`);
check("creates the orders table", env.DB.statements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS orders")));
check("records the alert result", [...env.DB.rows.values()][0]?.[14] === "email", String([...env.DB.rows.values()][0]?.[14]));
check("emails every kitchen address", emails[0]?.to?.length === 2, JSON.stringify(emails[0]?.to));
check(
  "subject carries the order and total",
  emails[0]?.subject === "New delivery order DQ-K4T2A — $74.17",
  emails[0]?.subject,
);
check(
  "body lists the items and total",
  (emails[0]?.text ?? "").includes("2 x Oxtail Pasta - $67.98") &&
    (emails[0]?.text ?? "").includes("Total paid: $74.17"),
);
check(
  "body carries the kitchen notes and phone",
  (emails[0]?.text ?? "").includes("Sauce") && (emails[0]?.text ?? "").includes("(972) 555-0134"),
);
check(
  "html escapes customer input",
  (emails[0]?.html ?? "").includes("&lt;script&gt;") && !(emails[0]?.html ?? "").includes("<script>alert"),
);

// 5b. The customer gets their own receipt and reminder
const customer = emails[1];
check("sends two emails: kitchen then customer", emails.length === 2, `emails ${emails.length}`);
check("addresses the customer", customer?.to?.length === 1 && customer.to[0] === "ada@example.com", JSON.stringify(customer?.to));
check(
  "subject is the receipt",
  customer?.subject === "Your Daqs & Oxtails receipt — DQ-K4T2A",
  customer?.subject,
);
check(
  "receipt lists items and the amount paid",
  (customer?.text ?? "").includes("2 x Oxtail Pasta — $67.98") &&
    (customer?.text ?? "").includes("Paid: $74.17"),
);
check(
  "reminder carries the delivery address",
  (customer?.text ?? "").includes("Delivery to: 123 Preston Rd, Plano, TX, 75024"),
);

// 5c. Pickup reminders point at the restaurant instead
const pickupBody = JSON.stringify({
  id: "evt_test_pickup",
  type: "checkout.session.completed",
  data: {
    object: {
      ...session,
      id: "cs_test_pickup",
      client_reference_id: "DQ-PICKUP",
      metadata: { ...session.metadata, fulfillment: "pickup" },
    },
  },
});
emails = [];
response = await deliver(pickupBody, await sign(pickupBody), env);
const pickupMail = emails.find((mail) => mail.to.includes("ada@example.com"));
check(
  "pickup reminder carries the restaurant address",
  (pickupMail?.text ?? "").includes("Pickup at: 8700 Preston Road, Suite 127, Plano, TX 75024"),
  String(pickupMail?.text ?? "").slice(0, 60),
);
check(
  "pickup reminder gives them the order number",
  (pickupMail?.text ?? "").includes("give them order DQ-PICKUP"),
);
check(
  "reminder repeats the ready time and the ID rule",
  (customer?.text ?? "").includes("Ready for: 12:30 PM") &&
    (customer?.text ?? "").includes("21 and over"),
);
check(
  "receipt html escapes the customer's own notes",
  (customer?.html ?? "").includes("&lt;script&gt;") && !(customer?.html ?? "").includes("<script>alert"),
);
check(
  "records that the customer was emailed",
  [...env.DB.rows.values()][0]?.[15] === "email",
  String([...env.DB.rows.values()][0]?.[15]),
);

// 5c. A customer with no email gets no receipt
const noEmailBody = JSON.stringify({
  id: "evt_test_noemail",
  type: "checkout.session.completed",
  data: {
    object: {
      ...session,
      id: "cs_test_no_email",
      client_reference_id: "DQ-NOEMAIL",
      customer_details: { name: "Walk In" },
    },
  },
});
emails = [];
response = await deliver(noEmailBody, await sign(noEmailBody), env);
payload = await response.json();
check("skips the receipt when there is no address", payload.customerNotified === "no_email", JSON.stringify(payload));
check("still alerts the kitchen", emails.length === 1 && emails[0].to.includes("kitchen@example.com"));

// 5d. A customer-email failure does not fail the payment webhook
const failingBody = JSON.stringify({
  id: "evt_test_customer_fail",
  type: "checkout.session.completed",
  data: { object: { ...session, id: "cs_test_customer_fail", client_reference_id: "DQ-CFAIL" } },
});
const healthyFetch = globalThis.fetch;
emails = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes("api.resend.com")) {
    const body = JSON.parse(init.body);
    if (body.to.includes("ada@example.com")) throw new Error("customer mail down");
    emails.push(body);
    return new Response("{}", { status: 200 });
  }
  return new Response("{}", { status: 200 });
};
response = await deliver(failingBody, await sign(failingBody), env);
payload = await response.json();
check("keeps the webhook green when the receipt fails", response.status === 200 && payload.stored === true);
check("records the customer failure", /email_failed/.test(String(payload.customerNotified)), String(payload.customerNotified));
check("kitchen still alerted", emails.length === 1);
globalThis.fetch = healthyFetch;

// 6. Stripe retries the same event
emails = [];
const rowsBefore = env.DB.rows.size;
response = await deliver(eventBody, header, env);
payload = await response.json();
check("acknowledges a duplicate without storing twice", response.status === 200 && payload.duplicate === true);
check(
  "does not re-alert on duplicates",
  emails.length === 0 && env.DB.rows.size === rowsBefore,
  `emails ${emails.length} rows ${env.DB.rows.size}`,
);

// 7. SMS fallback when email is absent
env = makeEnv({ RESEND_API_KEY: "", TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "tok", TWILIO_FROM_NUMBER: "+19720000000", KITCHEN_SMS_TO: "+19725550134" });
sms = [];
response = await deliver(eventBody, header, env);
payload = await response.json();
check("falls back to SMS", payload.notified === "sms", JSON.stringify(payload));
check("sms body starts with the order", (sms[0] ?? "").includes("DQ-K4T2A"), String(sms[0]).slice(0, 80));

// 8. No channel configured still stores the order
env = makeEnv({ RESEND_API_KEY: "" });
response = await deliver(eventBody, header, env);
payload = await response.json();
check("stores the order with no alert channel", response.status === 200 && payload.notified === "not_configured", JSON.stringify(payload));

// 9. Unpaid sessions are ignored
const unpaidBody = JSON.stringify({
  id: "evt_test_2",
  type: "checkout.session.completed",
  data: { object: { ...session, id: "cs_test_unpaid", payment_status: "unpaid" } },
});
env = makeEnv();
response = await deliver(unpaidBody, await sign(unpaidBody), env);
payload = await response.json();
check("ignores unpaid sessions", response.status === 200 && env.DB.rows.size === 0, JSON.stringify(payload));

// 10. Unrelated events are acknowledged
const otherBody = JSON.stringify({ id: "evt_3", type: "payment_intent.created", data: { object: {} } });
env = makeEnv();
response = await deliver(otherBody, await sign(otherBody), env);
payload = await response.json();
check("ignores unrelated events", response.status === 200 && /payment_intent/.test(payload.ignored ?? ""));

// 11. Tenant/provider failure does not lose the order
env = makeEnv();
globalThis.fetch = async (url) => {
  if (String(url).includes("api.resend.com")) throw new Error("resend down");
  return new Response("{}", { status: 200 });
};
response = await deliver(eventBody, header, env);
payload = await response.json();
check("keeps the order when email fails", response.status === 200 && payload.stored === true, JSON.stringify(payload));
check("records the failure", /email_failed/.test(String([...env.DB.rows.values()][0]?.[14])));

let failed = 0;
for (const result of results) {
  if (!result.pass) failed += 1;
  console.log(`${result.pass ? "pass" : "FAIL"}  ${result.label}${result.detail ? `  (${result.detail})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
