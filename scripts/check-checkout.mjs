/**
 * Checks the checkout Worker without touching Stripe.
 *
 * Stripe's API is stubbed so the test can inspect exactly what would be
 * charged, including a payload that tries to send its own prices.
 */
import { readFile } from "node:fs/promises";
import worker from "../deploy-worker.js";

const catalog = JSON.parse(
  await readFile(new URL("../dist/catalog.json", import.meta.url), "utf8"),
);

const results = [];
const check = (label, pass, detail = "") => results.push({ label, pass: Boolean(pass), detail });

const env = (key = "sk_test_dummy") => ({
  APP_ORIGIN: "https://example.test",
  STRIPE_SECRET_KEY: key,
  ASSETS: {
    fetch: async () =>
      new Response(JSON.stringify(catalog), {
        headers: { "content-type": "application/json" },
      }),
  },
});

let captured = null;
let stripeReply = {
  id: "cs_test_123",
  url: "https://checkout.stripe.com/c/pay/test",
};

globalThis.fetch = async (url, init) => {
  captured = { url: String(url), body: init?.body ? String(init.body) : "", headers: init?.headers };
  return new Response(JSON.stringify(stripeReply), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

const checkout = (body, key) =>
  worker.fetch(
    new Request("https://example.test/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env(key),
  );

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

const findSlot = (predicate) => {
  for (let step = 8; step < 2000; step += 1) {
    const candidate = new Date(Date.now() + step * 30 * 60 * 1000);
    const { weekday, minutes } = chicago(candidate);
    if (predicate(minutes, weekday)) return candidate;
  }
  throw new Error("no matching slot found");
};

const openSlot = () =>
  findSlot((minutes, weekday) => {
    const window = OPEN[weekday];
    return Boolean(window) && minutes >= window[0] * 60 && minutes < window[1] * 60;
  });

const base = {
  items: [{ id: "oxtail-pasta", addons: ["extra-oxtail"], qty: 2 }],
  fulfillment: "pickup",
  when: "12:30 PM",
  whenAt: openSlot().toISOString(),
  notes: "Sauce on the side",
  customer: {
    name: "Ada Lovelace",
    phone: "(972) 555-0134",
    email: "ada@example.com",
  },
};

// 1. Happy path
let response = await checkout(base);
let payload = await response.json();
let form = new URLSearchParams(captured?.body ?? "");

check("returns a Stripe url", response.status === 200 && payload.url === stripeReply.url, `status ${response.status}`);
check(
  "adds the add-on to the unit price (25.99 + 8.00)",
  form.get("line_items[0][price_data][unit_amount]") === "3399",
  form.get("line_items[0][price_data][unit_amount]"),
);
check("keeps the quantity", form.get("line_items[0][quantity]") === "2");
check(
  "charges tax on the subtotal",
  form.get("line_items[1][price_data][unit_amount]") === String(Math.round(6798 * catalog.taxRate)),
  form.get("line_items[1][price_data][unit_amount]"),
);
check(
  "no delivery line on pickup",
  form.get("line_items[2][price_data][product_data][name]") === null,
);
check(
  "success_url keeps the session placeholder",
  (form.get("success_url") ?? "").includes("/checkout/success?session_id={CHECKOUT_SESSION_ID}"),
  form.get("success_url"),
);
check("passes the phone to the kitchen", form.get("metadata[phone]") === "(972) 555-0134");
check("carries the notes", form.get("metadata[notes]") === "Sauce on the side");
check(
  "the kitchen gets the cooked-for time from the server, not the browser",
  form.get("metadata[when]") !== "12:30 PM" && /(AM|PM)/.test(form.get("metadata[when]") ?? ""),
  form.get("metadata[when]"),
);

// 2. Browser-sent prices must be ignored
response = await checkout({
  ...base,
  items: [{ id: "oxtail-pasta", qty: 1, price: 0.01, unitPrice: 0.01, unitPriceCents: 1 }],
});
form = new URLSearchParams(captured?.body ?? "");
check(
  "ignores prices sent by the browser",
  form.get("line_items[0][price_data][unit_amount]") === "2599",
  form.get("line_items[0][price_data][unit_amount]"),
);

// 3. Delivery adds the fee
response = await checkout({ ...base, fulfillment: "delivery" });
form = new URLSearchParams(captured?.body ?? "");
check(
  "adds the delivery fee",
  form.get("line_items[1][price_data][product_data][name]") === "Delivery" &&
    form.get("line_items[1][price_data][unit_amount]") === String(catalog.deliveryFeeCents),
  form.get("line_items[1][price_data][unit_amount]"),
);

// 4. Rejections
response = await checkout({ ...base, items: [{ id: "not-a-dish", qty: 1 }] });
check("rejects unknown dishes", response.status === 400);

response = await checkout({ ...base, items: [{ id: "oxtail-pasta", addons: ["nope"], qty: 1 }] });
check("rejects unknown add-ons", response.status === 400);

response = await checkout({ ...base, items: [] });
check("rejects an empty bag", response.status === 400);

response = await checkout({ ...base, customer: { name: "Ada", phone: "555" } });
check("requires a usable phone number", response.status === 400);

response = await checkout(base, "");
check("explains that payments are not configured", response.status === 503, `status ${response.status}`);

// 4b. No order may be placed for a time the store is closed
const closedSlot = findSlot((minutes) => minutes < 12 * 60 || minutes >= 22 * 60);
response = await checkout({ ...base, whenAt: closedSlot.toISOString() });
payload = await response.json();
check(
  "refuses a pickup time outside opening hours",
  response.status === 400 && payload.code === "closed",
  `${closedSlot.toISOString()} ${payload.code ?? response.status}`,
);

const mondaySlot = findSlot((_minutes, weekday) => weekday === "Monday");
response = await checkout({ ...base, whenAt: mondaySlot.toISOString() });
check("refuses a Monday pickup", response.status === 400, mondaySlot.toISOString());

response = await checkout({ ...base, whenAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
check("refuses a time too soon to cook", response.status === 400);

response = await checkout({ ...base, whenAt: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString() });
check("refuses a time beyond two weeks", response.status === 400);

response = await checkout({ ...base, whenAt: "not-a-time" });
payload = await response.json();
check(
  "an unreadable time falls back to ASAP and is still hour-checked",
  response.status === 200 || (response.status === 400 && payload.code === "closed"),
  `status ${response.status}`,
);

// 5. Session lookup maps Stripe's fields
stripeReply = {
  payment_status: "paid",
  amount_total: 7417,
  currency: "usd",
  customer_details: { email: "ada@example.com" },
  client_reference_id: "DQ-ABC123",
  metadata: { fulfillment: "delivery", when: "12:30 PM", customer_name: "Ada Lovelace" },
};
const sessionResponse = await worker.fetch(
  new Request("https://example.test/api/checkout/session?id=cs_test_1234567890"),
  env(),
);
const session = await sessionResponse.json();
check("reports the paid status", session.status === "paid" && session.amountTotal === 7417);
check("reports the order id and fulfilment", session.orderId === "DQ-ABC123" && session.fulfillment === "delivery");

const badSession = await worker.fetch(
  new Request("https://example.test/api/checkout/session?id=../../etc/passwd"),
  env(),
);
check("rejects a malformed session id", badSession.status === 400, `status ${badSession.status}`);

// Report
let failed = 0;
for (const result of results) {
  if (!result.pass) failed += 1;
  console.log(`${result.pass ? "pass" : "FAIL"}  ${result.label}${result.detail ? `  (${result.detail})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
