/**
 * Daqs & Oxtails Worker.
 *
 * Serves the Vite build from `dist` (with SPA fallback for client routes) and
 * handles online ordering under /api/*.
 *
 * Money is never taken from the browser: every amount is recalculated here
 * from `catalog.json`, which is generated at build time from the same menu data
 * the site renders. The browser sends item ids, add-on ids and quantities only.
 */

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const MAX_LINES = 30;
const MAX_ADDONS = 6;
const MAX_QTY = 20;
const MIN_ORDER_CENTS = 50;

const clean = (value, max = 240) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";

async function loadCatalog(env, origin) {
  const response = await env.ASSETS.fetch(new URL("/catalog.json", origin));
  if (!response.ok) throw new Error("The menu catalog is unavailable.");
  return response.json();
}

/**
 * Turns a cart payload into priced Stripe line items, or returns an error the
 * customer can act on. Unknown or stale ids are rejected rather than priced at
 * zero.
 */
function priceOrder(catalog, payload) {
  const entries = Array.isArray(payload?.items) ? payload.items.slice(0, MAX_LINES) : [];
  if (entries.length === 0) return { error: "Your bag is empty." };

  const items = Array.isArray(catalog?.items) ? catalog.items : [];
  const lines = [];
  let subtotal = 0;

  for (const entry of entries) {
    const item = items.find((candidate) => candidate.id === entry?.id);
    if (!item) {
      return { error: "One of those dishes is no longer on the menu. Refresh and try again." };
    }

    const qty = Math.min(MAX_QTY, Math.max(1, Number.parseInt(entry?.qty, 10) || 1));
    const addonIds = Array.isArray(entry?.addons) ? entry.addons.slice(0, MAX_ADDONS) : [];
    const addons = addonIds.map((id) =>
      (item.addons ?? []).find((addon) => addon.id === id),
    );

    if (addons.some((addon) => !addon)) {
      return { error: "One of those add-ons is no longer available. Refresh and try again." };
    }

    const unit = item.priceCents + addons.reduce((sum, addon) => sum + addon.priceCents, 0);
    subtotal += unit * qty;

    lines.push({
      name: item.name,
      description: addons.length > 0 ? addons.map((addon) => addon.label).join(", ") : "",
      amount: unit,
      quantity: qty,
    });
  }

  if (subtotal < MIN_ORDER_CENTS) {
    return { error: "That order is below the minimum the card processor accepts." };
  }

  const fulfillment = payload?.fulfillment === "delivery" ? "delivery" : "pickup";
  const delivery = fulfillment === "delivery" ? Number(catalog.deliveryFeeCents) || 0 : 0;
  const tax = Math.round(subtotal * (Number(catalog.taxRate) || 0));

  return {
    lines,
    delivery,
    tax,
    subtotal,
    total: subtotal + delivery + tax,
    fulfillment,
  };
}

async function stripeRequest(env, path, body, idempotencyKey) {
  const headers = {
    authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers,
    body: body.toString(),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message || `The payment provider rejected the request (${response.status}).`;
    throw new Error(message);
  }

  return data;
}

async function handleCheckout(request, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return json(
      {
        error:
          "Online card payment is not switched on for this site yet. Nothing was charged.",
        code: "stripe_not_configured",
      },
      503,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "We couldn't read that order. Please try again." }, 400);
  }

  const origin = env.APP_ORIGIN || new URL(request.url).origin;

  let catalog;
  try {
    catalog = await loadCatalog(env, origin);
  } catch (error) {
    return json({ error: error.message }, 503);
  }

  const priced = priceOrder(catalog, payload);
  if (priced.error) return json({ error: priced.error }, 400);

  const customer = payload?.customer ?? {};
  const name = clean(customer.name, 80);
  const phone = clean(customer.phone, 32);

  if (name.length < 2) return json({ error: "Please add the name for the order." }, 400);
  if (phone.replace(/\D/g, "").length < 10) {
    return json({ error: "Please add a phone number the kitchen can call." }, 400);
  }

  const email = clean(customer.email, 120);
  const notes = clean(payload?.notes, 300);

  // The kitchen can only cook while it is open, so the requested time is
  // checked here rather than trusted from the page. "ASAP" is measured from
  // the earliest realistic ready time, not from this instant.
  const parsedWhen = Date.parse(String(payload?.whenAt ?? ""));
  const wantsAsap = !Number.isFinite(parsedWhen);
  const whenAt = wantsAsap ? Date.now() + 40 * 60 * 1000 : parsedWhen;

  if (!wantsAsap) {
    const ahead = whenAt - Date.now();
    if (ahead < MIN_PICKUP_LEAD_MS) {
      return json({ error: "Pick a time at least 15 minutes from now." }, 400);
    }
    if (ahead > MAX_RESCHEDULE_MS) {
      return json({ error: "Pick a time within the next two weeks." }, 400);
    }
  }

  if (!isWithinServiceHours(whenAt)) {
    return json(
      {
        error: wantsAsap
          ? `We're closed right now, so we can't start an order. Pickup hours: ${PICKUP_HOURS_TEXT}.`
          : `We're closed at that time. Pickup hours: ${PICKUP_HOURS_TEXT}.`,
        code: "closed",
      },
      400,
    );
  }

  const when = wantsAsap ? "As soon as possible" : formatCentral(whenAt);
  const orderId = `DQ-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}/checkout?canceled=1`);
  params.set("client_reference_id", orderId);
  params.set("submit_type", "pay");
  params.set("phone_number_collection[enabled]", "true");
  params.set("custom_text[submit][message]", "Pay now and the kitchen starts your order.");
  params.set("metadata[order_id]", orderId);
  params.set("metadata[fulfillment]", priced.fulfillment);
  params.set("metadata[customer_name]", name);
  params.set("metadata[phone]", phone);
  params.set("metadata[when]", when);
  if (notes) params.set("metadata[notes]", notes);
  if (email) params.set("customer_email", email);

  if (priced.fulfillment === "delivery") {
    const address = clean(customer.address, 160);
    const zip = clean(customer.zip, 12);
    params.set(
      "metadata[address]",
      `${address}${zip ? `, ${zip}` : ""}`.replace(/^,\s*/, "").slice(0, 480),
    );
  }

  const lines = [...priced.lines];
  if (priced.delivery > 0) {
    lines.push({ name: "Delivery", description: "", amount: priced.delivery, quantity: 1 });
  }
  if (priced.tax > 0) {
    lines.push({
      name: `Sales tax (${((Number(catalog.taxRate) || 0) * 100).toFixed(2)}%)`,
      description: "",
      amount: priced.tax,
      quantity: 1,
    });
  }

  lines.forEach((line, index) => {
    params.set(`line_items[${index}][quantity]`, String(line.quantity));
    params.set(`line_items[${index}][price_data][currency]`, catalog.currency || "usd");
    params.set(`line_items[${index}][price_data][unit_amount]`, String(line.amount));
    params.set(`line_items[${index}][price_data][product_data][name]`, clean(line.name, 120));
    if (line.description) {
      params.set(
        `line_items[${index}][price_data][product_data][description]`,
        clean(line.description, 200),
      );
    }
  });

  try {
    const session = await stripeRequest(env, "checkout/sessions", params, `order-${orderId}`);
    if (!session?.url) return json({ error: "The payment provider returned no checkout link." }, 502);
    return json({ url: session.url, orderId, total: priced.total });
  } catch (error) {
    return json({ error: error.message || "The payment provider is unavailable." }, 502);
  }
}

async function handleSession(url, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Online card payment is not switched on for this site yet." }, 503);
  }

  const id = url.searchParams.get("id") || "";
  if (!/^cs_[A-Za-z0-9_]{8,150}$/.test(id)) {
    return json({ error: "That checkout link isn't valid." }, 400);
  }

  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`,
    { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
  );
  const session = await response.json().catch(() => null);

  if (!response.ok || !session) {
    return json({ error: "We couldn't find that checkout session." }, 404);
  }

  return json({
    status: session.payment_status ?? "unpaid",
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
    email: session.customer_details?.email ?? null,
    orderId: session.client_reference_id ?? session.metadata?.order_id ?? null,
    fulfillment: session.metadata?.fulfillment ?? "pickup",
    when: session.metadata?.when ?? null,
    name: session.metadata?.customer_name ?? null,
  });
}

async function handleConfig(env, origin) {
  const stripe = Boolean(env.STRIPE_SECRET_KEY);
  try {
    const catalog = await loadCatalog(env, origin);
    return json({
      stripe,
      currency: catalog.currency ?? "usd",
      taxRate: catalog.taxRate ?? null,
      deliveryFeeCents: catalog.deliveryFeeCents ?? null,
    });
  } catch {
    return json({ stripe, currency: "usd", taxRate: null, deliveryFeeCents: null });
  }
}

/* ---------------------------------------------------------------------
 * Paid orders: Stripe webhook -> D1 -> kitchen alert
 * ------------------------------------------------------------------- */

const encoder = new TextEncoder();

const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const timingSafeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
};

/** Verifies Stripe's `Stripe-Signature` header against the raw request body. */
async function verifySignature(rawBody, header, secret, toleranceSeconds = 300) {
  if (!header) return { ok: false, reason: "missing signature header" };

  let timestamp = null;
  const signatures = [];

  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return { ok: false, reason: "malformed signature" };

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = toHex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)),
  );

  return signatures.some((signature) => timingSafeEqual(signature, expected))
    ? { ok: true }
    : { ok: false, reason: "signature mismatch" };
}

const money = (cents, currency = "usd") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency).toUpperCase(),
    }).format((Number(cents) || 0) / 100);
  } catch {
    return `$${((Number(cents) || 0) / 100).toFixed(2)}`;
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

async function ensureOrdersTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS orders (
       session_id TEXT PRIMARY KEY,
       order_id TEXT,
       created_at INTEGER NOT NULL,
       amount_total INTEGER NOT NULL,
       currency TEXT NOT NULL,
       status TEXT NOT NULL,
       fulfillment TEXT,
       customer_name TEXT,
       phone TEXT,
       email TEXT,
       requested_for TEXT,
       notes TEXT,
       address TEXT,
       items TEXT,
       notified TEXT,
       customer_notified TEXT,
       kitchen_status TEXT NOT NULL DEFAULT 'new',
       updated_at INTEGER
     )`,
  ).run();

  // Tables created before the kitchen screen existed still need these columns.
  for (const statement of [
    "ALTER TABLE orders ADD COLUMN kitchen_status TEXT NOT NULL DEFAULT 'new'",
    "ALTER TABLE orders ADD COLUMN updated_at INTEGER",
    "ALTER TABLE orders ADD COLUMN customer_notified TEXT",
    "ALTER TABLE orders ADD COLUMN cancelled_at INTEGER",
    "ALTER TABLE orders ADD COLUMN reschedule_count INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      await env.DB.prepare(statement).run();
    } catch {
      /* column already exists */
    }
  }
}

async function insertOrder(env, order) {
  const result = await env.DB.prepare(
    `INSERT INTO orders (
       session_id, order_id, created_at, amount_total, currency, status,
       fulfillment, customer_name, phone, email, requested_for, notes, address, items, notified
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO NOTHING`,
  )
    .bind(
      order.sessionId,
      order.orderId,
      Date.now(),
      order.amountTotal,
      order.currency,
      order.status,
      order.fulfillment,
      order.name,
      order.phone,
      order.email,
      order.requestedFor,
      order.notes,
      order.address,
      JSON.stringify(order.items),
      "pending",
    )
    .run();

  return (result?.meta?.changes ?? 0) > 0;
}

/** Stripe's event omits line items unless asked for, so fetch them if needed. */
async function enrichSession(session, env) {
  if (session?.line_items?.data) return session;
  if (!env.STRIPE_SECRET_KEY || !session?.id) return session;

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id)}?expand[]=line_items`,
      { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
    );
    if (!response.ok) return session;
    return await response.json();
  } catch {
    return session;
  }
}

function toOrder(session) {
  const lines = Array.isArray(session?.line_items?.data) ? session.line_items.data : [];

  return {
    sessionId: session.id,
    orderId: session.client_reference_id || session.metadata?.order_id || session.id,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    status: session.payment_status ?? "paid",
    fulfillment: session.metadata?.fulfillment === "delivery" ? "delivery" : "pickup",
    name: session.metadata?.customer_name || session.customer_details?.name || "Customer",
    phone: session.metadata?.phone || session.customer_details?.phone || "",
    email: session.customer_details?.email || "",
    requestedFor: session.metadata?.when || "As soon as possible",
    notes: session.metadata?.notes || "",
    address: session.metadata?.address || "",
    items: lines.map((line) => ({
      name: line.description || line.price?.product_data?.name || "Item",
      qty: line.quantity ?? 1,
      amount: line.amount_total ?? 0,
    })),
  };
}

const RESTAURANT = {
  address: "8700 Preston Road, Suite 127, Plano, TX 75024",
  phone: "(972) 292-9771",
};

function receiptLines(order) {
  return order.items.length
    ? order.items.map((line) => `  ${line.qty} x ${line.name} — ${money(line.amount, order.currency)}`)
    : [];
}

function formatReceiptText(order, link = "") {
  const isDelivery = order.fulfillment === "delivery";
  const firstName = order.name && order.name !== "Customer" ? order.name.split(" ")[0] : null;

  return [
    `Thanks${firstName ? `, ${firstName}` : ""} — your order is paid.`,
    "",
    `Order: ${order.orderId}`,
    `Paid: ${money(order.amountTotal, order.currency)}`,
    "",
    ...receiptLines(order),
    "",
    order.notes ? `Notes for the kitchen: ${order.notes}` : null,
    "",
    isDelivery
      ? `Delivery to: ${order.address || "the address on your order"}`
      : `Pickup at: ${RESTAURANT.address}`,
    `Ready for: ${order.requestedFor}`,
    "",
    isDelivery
      ? "The driver will head your way at that time. Keep your phone nearby in case they need to reach you."
      : `Come in at that time and give them order ${order.orderId}.`,
    link ? `Reschedule or cancel: ${link}` : null,
    `Questions or changes? Call ${RESTAURANT.phone}.`,
    "",
    "Daiquiris require a valid ID — 21 and over. Please drink responsibly.",
    "",
    "Daqs & Oxtails · Soul food & frozen daiquiris · Plano, TX",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function formatReceiptHtml(order, link = "") {
  const isDelivery = order.fulfillment === "delivery";
  const firstName = order.name && order.name !== "Customer" ? order.name.split(" ")[0] : null;
  const rows = order.items.length
    ? order.items
        .map(
          (line) =>
            `<tr><td style="padding:4px 0">${escapeHtml(line.qty)} x ${escapeHtml(line.name)}</td><td align="right" style="padding:4px 0">${escapeHtml(money(line.amount, order.currency))}</td></tr>`,
        )
        .join("")
    : "";

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;color:#0b1424">
  <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1d3d9c">Order ${escapeHtml(order.orderId)} · paid</p>
  <h1 style="margin:6px 0 4px;font-size:26px">Thanks${firstName ? `, ${escapeHtml(firstName)}` : ""} — you're all set.</h1>
  <p style="margin:0 0 16px;font-size:20px;font-weight:700">${escapeHtml(money(order.amountTotal, order.currency))}</p>
  <p style="margin:0 0 4px"><strong>${isDelivery ? "Delivery" : "Pickup"}</strong> · ready for ${escapeHtml(order.requestedFor)}</p>
  <p style="margin:0 0 16px">${isDelivery ? escapeHtml(order.address || "The address on your order") : escapeHtml(RESTAURANT.address)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    <tr><td style="border-top:1px solid #ddd;padding-top:8px;font-weight:700">Total paid</td><td style="border-top:1px solid #ddd;padding-top:8px;font-weight:700" align="right">${escapeHtml(money(order.amountTotal, order.currency))}</td></tr>
  </table>
  <p style="margin:16px 0 0;padding:12px;background:#f6f1e7;border-radius:8px;font-size:14px">${isDelivery ? "The driver heads your way at that time — keep your phone nearby." : `Give them order <strong>${escapeHtml(order.orderId)}</strong> at the counter.`}</p>
  ${order.notes ? `<p style="margin:16px 0 0;padding:12px;background:#f6f1e7;border-radius:8px;font-size:14px"><strong>Your notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
  ${link ? `<p style="margin:16px 0 0;font-size:14px"><a href="${escapeHtml(link)}" style="color:#1d3d9c;font-weight:600">Reschedule or cancel this order</a></p>` : ""}
  <p style="margin:16px 0 0;font-size:14px">Questions or changes? Call <a href="tel:+19722929771" style="color:#1d3d9c">${escapeHtml(RESTAURANT.phone)}</a>.</p>
  <p style="margin:16px 0 0;font-size:12px;color:#666">Daiquiris require a valid ID — 21 and over. Please drink responsibly.<br/>Daqs &amp; Oxtails · Plano, TX</p>
</div>`;
}

function formatOrderText(order) {
  const lines = order.items.length
    ? order.items.map((line) => `  ${line.qty} x ${line.name} - ${money(line.amount, order.currency)}`)
    : ["  (line items unavailable — open the session in Stripe)"];

  return [
    `NEW ${order.fulfillment.toUpperCase()} ORDER ${order.orderId}`,
    `Total paid: ${money(order.amountTotal, order.currency)}`,
    `Ready for: ${order.requestedFor}`,
    "",
    ...lines,
    "",
    `Name: ${order.name}`,
    `Phone: ${order.phone || "not provided"}`,
    order.email ? `Email: ${order.email}` : null,
    order.address ? `Address: ${order.address}` : null,
    order.notes ? `Notes: ${order.notes}` : null,
    "",
    `Stripe session: ${order.sessionId}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function formatOrderHtml(order) {
  const rows = order.items.length
    ? order.items
        .map(
          (line) =>
            `<tr><td>${escapeHtml(line.qty)} x ${escapeHtml(line.name)}</td><td align="right">${escapeHtml(money(line.amount, order.currency))}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2">Line items unavailable — open the session in Stripe.</td></tr>`;

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
  <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1d3d9c">New ${escapeHtml(order.fulfillment)} order</p>
  <h1 style="margin:6px 0 2px;font-size:26px">${escapeHtml(order.orderId)}</h1>
  <p style="margin:0 0 16px;font-size:20px;font-weight:700">${escapeHtml(money(order.amountTotal, order.currency))} paid</p>
  <p style="margin:0 0 4px"><strong>Ready for:</strong> ${escapeHtml(order.requestedFor)}</p>
  <p style="margin:0 0 16px"><strong>${escapeHtml(order.name)}</strong>${order.phone ? ` · ${escapeHtml(order.phone)}` : ""}${order.email ? ` · ${escapeHtml(order.email)}` : ""}</p>
  ${order.address ? `<p style="margin:0 0 16px"><strong>Address:</strong> ${escapeHtml(order.address)}</p>` : ""}
  <table style="width:100%;border-collapse:collapse" cellpadding="8">${rows}
    <tr><td style="border-top:1px solid #ddd;font-weight:700">Total</td><td style="border-top:1px solid #ddd;font-weight:700" align="right">${escapeHtml(money(order.amountTotal, order.currency))}</td></tr>
  </table>
  ${order.notes ? `<p style="margin:16px 0 0;padding:12px;background:#f6f1e7;border-radius:8px"><strong>Kitchen notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
  <p style="margin:16px 0 0;font-size:12px;color:#666">Stripe session ${escapeHtml(order.sessionId)}</p>
</div>`;
}

const emailConfigured = (env) => Boolean(env.RESEND_API_KEY && env.KITCHEN_EMAIL);

const smsConfigured = (env) =>
  Boolean(
    env.TWILIO_ACCOUNT_SID &&
      env.TWILIO_AUTH_TOKEN &&
      env.TWILIO_FROM_NUMBER &&
      env.KITCHEN_SMS_TO,
  );

const kitchenRecipients = (env) =>
  String(env.KITCHEN_EMAIL)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

async function postEmail(env, message) {
  const payload = {
    from: env.ORDER_EMAIL_FROM || "Daqs & Oxtails <onboarding@resend.dev>",
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
  if (message.replyTo) payload.reply_to = message.replyTo;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email provider returned ${response.status} ${detail}`.trim());
  }
}

async function sendEmail(env, order, text) {
  await postEmail(env, {
    to: kitchenRecipients(env),
    subject: `New ${order.fulfillment} order ${order.orderId} — ${money(order.amountTotal, order.currency)}`,
    text,
    html: formatOrderHtml(order),
  });
}

/**
 * Sends the customer their receipt and pickup reminder. Separate from the
 * kitchen alert so one failing never suppresses the other.
 */
async function notifyCustomer(env, order, link = "") {
  if (!order.email) return "no_email";
  if (!env.RESEND_API_KEY) return "not_configured";

  try {
    await postEmail(env, {
      to: [order.email],
      subject: `Your Daqs & Oxtails receipt — ${order.orderId}`,
      text: formatReceiptText(order, link),
      html: formatReceiptHtml(order, link),
      replyTo: kitchenRecipients(env)[0],
    });
    return "email";
  } catch (error) {
    return `email_failed: ${error.message}`.slice(0, 160);
  }
}

async function sendSms(env, text) {
  const account = String(env.TWILIO_ACCOUNT_SID);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(account)}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${account}:${env.TWILIO_AUTH_TOKEN}`)}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: String(env.KITCHEN_SMS_TO),
        From: String(env.TWILIO_FROM_NUMBER),
        Body: text.slice(0, 1500),
      }).toString(),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`SMS provider returned ${response.status} ${detail}`.trim());
  }
}

/**
 * Alerts the kitchen on every configured channel. A provider failure is
 * recorded, never allowed to fail the webhook — Stripe would retry and the
 * order is already stored.
 */
async function notifyKitchen(env, order) {
  const text = formatOrderText(order);
  const sent = [];

  if (emailConfigured(env)) {
    try {
      await sendEmail(env, order, text);
      sent.push("email");
    } catch (error) {
      sent.push(`email_failed: ${error.message}`.slice(0, 160));
    }
  }

  if (smsConfigured(env)) {
    try {
      await sendSms(env, text);
      sent.push("sms");
    } catch (error) {
      sent.push(`sms_failed: ${error.message}`.slice(0, 160));
    }
  }

  return sent.length > 0 ? sent.join(", ") : "not_configured";
}

async function handleStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: "Webhook secret is not configured." }, 503);
  }

  const rawBody = await request.text();
  const verdict = await verifySignature(
    rawBody,
    request.headers.get("stripe-signature"),
    env.STRIPE_WEBHOOK_SECRET,
  );

  if (!verdict.ok) {
    return json({ error: "Invalid signature.", reason: verdict.reason }, 400);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid payload." }, 400);
  }

  if (
    event?.type !== "checkout.session.completed" &&
    event?.type !== "checkout.session.async_payment_succeeded"
  ) {
    return json({ received: true, ignored: event?.type ?? "unknown" });
  }

  const session = await enrichSession(event.data?.object, env);
  const paid =
    session?.payment_status === "paid" || session?.payment_status === "no_payment_required";

  if (!paid) {
    return json({ received: true, ignored: `payment_status=${session?.payment_status}` });
  }

  if (!env.DB) {
    return json({ error: "Order storage is not configured." }, 503);
  }

  const order = toOrder(session);

  try {
    await ensureOrdersTable(env);
    const stored = await insertOrder(env, order);

    // Stripe retries deliveries; only the first one notifies the kitchen.
    if (!stored) return json({ received: true, duplicate: true });

    const notified = await notifyKitchen(env, order);
    const link =
      order.fulfillment === "pickup" ? await customerOrderUrl(env, request, order.sessionId) : "";
    const customerNotified = await notifyCustomer(env, order, link);

    await env.DB.prepare(
      "UPDATE orders SET notified = ?, customer_notified = ? WHERE session_id = ?",
    )
      .bind(notified, customerNotified, order.sessionId)
      .run();

    return json({ received: true, stored: true, notified, customerNotified });
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want if storage failed.
    return json({ error: error.message || "Could not record the order." }, 500);
  }
}

/* ---------------------------------------------------------------------
 * Customer self-service: reschedule or cancel a paid pickup order
 *
 * The receipt links here with an HMAC over the session id, so no account is
 * needed and no order can be reached by guessing. Changing a paid order is
 * only allowed while the kitchen has not started it.
 * ------------------------------------------------------------------- */

const MIN_RESCHEDULE_MS = 30 * 60 * 1000;
const MIN_PICKUP_LEAD_MS = 15 * 60 * 1000;
const MAX_RESCHEDULE_MS = 14 * 24 * 60 * 60 * 1000;

// Mirrors src/lib/hours.ts. Times are minutes from midnight, Central.
const SERVICE_HOURS = {
  Monday: null,
  Tuesday: [12 * 60, 21 * 60],
  Wednesday: [12 * 60, 21 * 60],
  Thursday: [12 * 60, 21 * 60],
  Friday: [12 * 60, 22 * 60],
  Saturday: [12 * 60, 22 * 60],
  Sunday: [12 * 60, 20 * 60],
};

const PICKUP_HOURS_TEXT =
  "Tue–Thu 12–9 PM, Fri–Sat 12–10 PM, Sun 12–8 PM (closed Mondays)";

function chicagoClock(instant) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sunday";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return { weekday, minutes: hour * 60 + minute };
}

/** True when the kitchen is serving at that instant, in Central time. */
function isWithinServiceHours(instant) {
  const { weekday, minutes } = chicagoClock(instant);
  const window = SERVICE_HOURS[weekday];
  if (!window) return false;
  return minutes >= window[0] && minutes < window[1];
}

const ORDER_COLUMNS = `session_id, order_id, created_at, updated_at, amount_total, currency,
            status, kitchen_status, fulfillment, customer_name, phone, email, requested_for,
            notes, address, items, notified, customer_notified, cancelled_at, reschedule_count`;

function rowToOrder(row) {
  let items = [];
  try {
    items = JSON.parse(row.items ?? "[]");
  } catch {
    items = [];
  }

  return {
    sessionId: row.session_id,
    orderId: row.order_id,
    amountTotal: Number(row.amount_total) || 0,
    currency: row.currency || "usd",
    status: row.status,
    kitchenStatus: row.kitchen_status || "new",
    fulfillment: row.fulfillment === "delivery" ? "delivery" : "pickup",
    name: row.customer_name || "Customer",
    phone: row.phone || "",
    email: row.email || "",
    requestedFor: row.requested_for || "",
    notes: row.notes || "",
    address: row.address || "",
    items,
  };
}

const changeable = (order) =>
  order.fulfillment === "pickup" && order.kitchenStatus === "new" && order.status !== "refunded";

async function signOrderLink(env, sessionId) {
  const secret = env.CUSTOMER_LINK_SECRET || env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret || !sessionId) return "";

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = toHex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`order-link:${sessionId}`)),
  );
  return digest.slice(0, 40);
}

async function verifyOrderLink(env, sessionId, token) {
  const expected = await signOrderLink(env, sessionId);
  return Boolean(expected) && timingSafeEqual(String(token ?? ""), expected);
}

async function customerOrderUrl(env, request, sessionId) {
  const secret = env.CUSTOMER_LINK_SECRET || env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) return "";
  const origin = env.APP_ORIGIN || new URL(request.url).origin;
  return `${origin}/order/${encodeURIComponent(sessionId)}?t=${await signOrderLink(env, sessionId)}`;
}

const formatCentral = (instant) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(instant));

async function loadCustomerOrder(env, sessionId) {
  await ensureOrdersTable(env);
  const row = await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE session_id = ?`)
    .bind(sessionId)
    .first();
  return row ? rowToOrder(row) : null;
}

/** Shared gate for the two write endpoints: token, order, and change window. */
async function readCustomerChange(request, env) {
  if (!sameOriginAccepted(request, env)) {
    return { response: json({ error: "Cross-origin request refused." }, 403) };
  }
  if (!env.DB) return { response: json({ error: "Order storage is not configured." }, 503) };

  let body;
  try {
    body = await request.json();
  } catch {
    return { response: json({ error: "We couldn't read that request." }, 400) };
  }

  const sessionId = clean(body?.sessionId, 120);
  const token = typeof body?.t === "string" ? body.t : "";
  if (!sessionId || !(await verifyOrderLink(env, sessionId, token))) {
    return { response: json({ error: "That link isn't valid. Open the link from your receipt." }, 404) };
  }

  const order = await loadCustomerOrder(env, sessionId);
  if (!order) return { response: json({ error: "That order isn't in the database." }, 404) };

  if (order.status === "refunded" || order.kitchenStatus === "cancelled") {
    return { response: json({ error: "This order is already cancelled and refunded." }, 409) };
  }
  if (order.fulfillment !== "pickup") {
    return {
      response: json({
        error: `Delivery orders are handled by the kitchen — call ${RESTAURANT.phone}.`,
        code: "not_changeable",
      }, 409),
    };
  }
  if (!changeable(order)) {
    return {
      response: json({
        error: "The kitchen has already started this order, so it can't be changed here. Give us a call.",
        code: "already_started",
      }, 409),
    };
  }

  return { order, sessionId, body };
}

async function notifyKitchenChange(env, order, subject, text) {
  if (!emailConfigured(env)) return "not_configured";
  try {
    await postEmail(env, { to: kitchenRecipients(env), subject, text });
    return "email";
  } catch (error) {
    return `email_failed: ${error.message}`.slice(0, 160);
  }
}

async function notifyCustomerChange(env, order, subject, text) {
  if (!order.email) return "no_email";
  if (!env.RESEND_API_KEY) return "not_configured";
  try {
    await postEmail(env, {
      to: [order.email],
      subject,
      text,
      replyTo: kitchenRecipients(env)[0],
    });
    return "email";
  } catch (error) {
    return `email_failed: ${error.message}`.slice(0, 160);
  }
}

async function refundOrder(env, sessionId) {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
  );
  const session = await response.json().catch(() => null);
  const intent =
    typeof session?.payment_intent === "string" ? session.payment_intent : session?.payment_intent?.id;

  if (!response.ok || !intent) {
    throw new Error("the payment provider could not find that payment");
  }

  return stripeRequest(
    env,
    "refunds",
    new URLSearchParams({ payment_intent: intent, reason: "requested_by_customer" }),
    `refund-${sessionId}`,
  );
}

async function handleCustomerOrder(url, env) {
  if (!env.DB) return json({ error: "Order storage is not configured." }, 503);

  const sessionId = clean(url.searchParams.get("sessionId"), 120);
  if (!sessionId || !(await verifyOrderLink(env, sessionId, url.searchParams.get("t")))) {
    return json({ error: "That link isn't valid." }, 404);
  }

  const order = await loadCustomerOrder(env, sessionId);
  if (!order) return json({ error: "That order isn't in the database." }, 404);

  return json({
    order: {
      orderId: order.orderId,
      name: order.name.split(" ")[0] || "",
      requestedFor: order.requestedFor,
      fulfillment: order.fulfillment,
      kitchenStatus: order.kitchenStatus,
      status: order.status,
      amountTotal: order.amountTotal,
      currency: order.currency,
      items: order.items,
      notes: order.notes,
      canChange: changeable(order),
      pickupAddress: RESTAURANT.address,
    },
  });
}

async function handleCustomerReschedule(request, env) {
  const gate = await readCustomerChange(request, env);
  if (gate.response) return gate.response;

  const { order, sessionId, body } = gate;
  const instant = Date.parse(String(body?.when ?? ""));

  if (!Number.isFinite(instant)) {
    return json({ error: "Pick the new pickup time." }, 400);
  }

  const ahead = instant - Date.now();
  if (ahead < MIN_RESCHEDULE_MS) {
    return json({ error: "Pick a time at least 30 minutes from now." }, 400);
  }
  if (ahead > MAX_RESCHEDULE_MS) {
    return json({ error: "Pick a time within the next two weeks." }, 400);
  }
  if (!isWithinServiceHours(instant)) {
    return json(
      {
        error: `We're closed at that time, so we can't cook it. Pickup hours: ${PICKUP_HOURS_TEXT}.`,
        code: "closed",
      },
      400,
    );
  }

  const label = formatCentral(instant);
  await env.DB.prepare(
    `UPDATE orders SET requested_for = ?, updated_at = ?,
       reschedule_count = COALESCE(reschedule_count, 0) + 1
     WHERE session_id = ?`,
  )
    .bind(label, Date.now(), sessionId)
    .run();

  const updated = { ...order, requestedFor: label };
  const items = order.items.length
    ? order.items.map((line) => `  ${line.qty} x ${line.name}`).join("\n")
    : "  (line items on the Stripe receipt)";

  const kitchen = await notifyKitchenChange(
    env,
    updated,
    `Order ${order.orderId} moved to ${label}`,
    [
      `The customer moved order ${order.orderId}.`,
      "",
      `Was: ${order.requestedFor || "ASAP"}`,
      `Now: ${label}`,
      "",
      items,
      "",
      `${order.name} · ${order.phone || "no phone"}`,
    ].join("\n"),
  );

  const customer = await notifyCustomerChange(
    env,
    updated,
    `Your order ${order.orderId} is now for ${label}`,
    [
      `We moved your order to ${label}.`,
      "",
      `Order: ${order.orderId}`,
      `Pickup at: ${RESTAURANT.address}`,
      "",
      items,
      "",
      `Need to change it again? Call ${RESTAURANT.phone}.`,
    ].join("\n"),
  );

  return json({ ok: true, requestedFor: label, kitchenNotified: kitchen, customerNotified: customer });
}

async function handleCustomerCancel(request, env) {
  const gate = await readCustomerChange(request, env);
  if (gate.response) return gate.response;

  const { order, sessionId } = gate;

  if (!env.STRIPE_SECRET_KEY) {
    return json(
      {
        error: `We can't refund online right now. Call ${RESTAURANT.phone} and we'll cancel it for you.`,
        code: "stripe_not_configured",
      },
      503,
    );
  }

  let refund;
  try {
    refund = await refundOrder(env, sessionId);
  } catch (error) {
    return json(
      {
        error: `We couldn't refund that automatically (${error.message}). Call ${RESTAURANT.phone} and we'll sort it out.`,
      },
      502,
    );
  }

  const now = Date.now();
  await env.DB.prepare(
    `UPDATE orders SET status = 'refunded', kitchen_status = 'cancelled',
       updated_at = ?, cancelled_at = ? WHERE session_id = ?`,
  )
    .bind(now, now, sessionId)
    .run();

  const moneyBack = money(order.amountTotal, order.currency);
  const items = order.items.length
    ? order.items.map((line) => `  ${line.qty} x ${line.name}`).join("\n")
    : "  (line items on the Stripe receipt)";

  const kitchen = await notifyKitchenChange(
    env,
    order,
    `CANCELLED — order ${order.orderId} (${moneyBack} refunded)`,
    [
      `The customer cancelled order ${order.orderId}.`,
      `Refunded: ${moneyBack}`,
      "",
      items,
      "",
      "Do not prepare this order.",
    ].join("\n"),
  );

  const customer = await notifyCustomerChange(
    env,
    order,
    `Your order ${order.orderId} is cancelled — ${moneyBack} refunded`,
    [
      `Order ${order.orderId} is cancelled and ${moneyBack} was refunded to your card.`,
      "",
      "Refunds usually land in 5–10 business days, depending on your bank.",
      "",
      `Questions? Call ${RESTAURANT.phone}.`,
    ].join("\n"),
  );

  return json({
    ok: true,
    refunded: order.amountTotal,
    refundId: refund?.id ?? null,
    kitchenNotified: kitchen,
    customerNotified: customer,
  });
}

/* ---------------------------------------------------------------------
 * Kitchen screen: password login, order list, status changes
 * ------------------------------------------------------------------- */

const KITCHEN_COOKIE = "daq_kitchen";
const KITCHEN_SESSION_SECONDS = 12 * 60 * 60;
const KITCHEN_STATUSES = ["new", "started", "completed"];
const LOGIN_ATTEMPTS = new Map();

async function kitchenSignature(env, expires) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(env.KITCHEN_PASSWORD)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`kitchen:${expires}`)));
}

async function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

async function isKitchenAuthorized(request, env) {
  if (!env.KITCHEN_PASSWORD) return false;

  const token = await readCookie(request, KITCHEN_COOKIE);
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;

  const expiry = Number(expires);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;

  return timingSafeEqual(signature, await kitchenSignature(env, expiry));
}

function sameOriginAccepted(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = [new URL(request.url).origin, env.APP_ORIGIN].filter(Boolean);
  return allowed.includes(origin);
}

function cookieHeader(request, token, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${KITCHEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

async function handleKitchenSession(request, env) {
  return json({
    configured: Boolean(env.KITCHEN_PASSWORD),
    authenticated: await isKitchenAuthorized(request, env),
    storage: Boolean(env.DB),
  });
}

async function handleKitchenLogin(request, env) {
  if (!env.KITCHEN_PASSWORD) {
    return json(
      { error: "The kitchen screen isn't set up yet — add KITCHEN_PASSWORD.", code: "kitchen_not_configured" },
      503,
    );
  }
  if (!sameOriginAccepted(request, env)) return json({ error: "Cross-origin request refused." }, 403);

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const record = LOGIN_ATTEMPTS.get(ip);

  if (record && record.until > now) {
    return json({ error: "Too many attempts. Wait a few minutes and try again." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "We couldn't read that request." }, 400);
  }

  const password = typeof body?.password === "string" ? body.password : "";
  const matches = password.length > 0 && timingSafeEqual(password, String(env.KITCHEN_PASSWORD));

  if (!matches) {
    const failures = (record?.count ?? 0) + 1;
    LOGIN_ATTEMPTS.set(
      ip,
      failures >= 6 ? { count: 0, until: now + 10 * 60 * 1000 } : { count: failures, until: 0 },
    );
    await new Promise((resolve) => setTimeout(resolve, 350));
    return json({ error: "That password didn't match." }, 401);
  }

  LOGIN_ATTEMPTS.delete(ip);
  const expires = Date.now() + KITCHEN_SESSION_SECONDS * 1000;
  const token = `${expires}.${await kitchenSignature(env, expires)}`;

  return new Response(JSON.stringify({ ok: true, expires }), {
    status: 200,
    headers: {
      ...JSON_HEADERS,
      "set-cookie": cookieHeader(request, token, KITCHEN_SESSION_SECONDS),
    },
  });
}

async function handleKitchenLogout(request, env) {
  if (!sameOriginAccepted(request, env)) return json({ error: "Cross-origin request refused." }, 403);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...JSON_HEADERS, "set-cookie": cookieHeader(request, "", 0) },
  });
}

async function handleKitchenOrders(request, env, url) {
  if (!env.KITCHEN_PASSWORD) {
    return json({ error: "The kitchen screen isn't set up yet.", code: "kitchen_not_configured" }, 503);
  }
  if (!(await isKitchenAuthorized(request, env))) return json({ error: "Sign in first." }, 401);
  if (!env.DB) return json({ error: "Order storage is not configured." }, 503);

  await ensureOrdersTable(env);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

  const result = await env.DB.prepare(
    `SELECT session_id, order_id, created_at, updated_at, amount_total, currency,
            kitchen_status, fulfillment, customer_name, phone, email, requested_for,
            notes, address, items, notified
       FROM orders ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all();

  const orders = (result?.results ?? []).map((row) => {
    let items = [];
    try {
      items = JSON.parse(row.items ?? "[]");
    } catch {
      items = [];
    }
    return { ...row, items };
  });

  return json({ orders, fetchedAt: Date.now() });
}

async function handleKitchenOrder(request, env, url) {
  if (!env.KITCHEN_PASSWORD) {
    return json({ error: "The kitchen screen isn't set up yet.", code: "kitchen_not_configured" }, 503);
  }
  if (!(await isKitchenAuthorized(request, env))) return json({ error: "Sign in first." }, 401);
  if (!env.DB) return json({ error: "Order storage is not configured." }, 503);

  const sessionId = clean(url.searchParams.get("sessionId"), 120);
  if (!sessionId) return json({ error: "Which order?" }, 400);

  await ensureOrdersTable(env);
  const row = await env.DB.prepare(
    `SELECT session_id, order_id, created_at, updated_at, amount_total, currency,
            kitchen_status, fulfillment, customer_name, phone, email, requested_for,
            notes, address, items, notified
       FROM orders WHERE session_id = ?`,
  )
    .bind(sessionId)
    .first();

  if (!row) return json({ error: "That order isn't in the database." }, 404);

  let items = [];
  try {
    items = JSON.parse(row.items ?? "[]");
  } catch {
    items = [];
  }

  return json({ order: { ...row, items } });
}

async function handleKitchenStatus(request, env) {
  if (!env.KITCHEN_PASSWORD) {
    return json({ error: "The kitchen screen isn't set up yet.", code: "kitchen_not_configured" }, 503);
  }
  if (!(await isKitchenAuthorized(request, env))) return json({ error: "Sign in first." }, 401);
  if (!sameOriginAccepted(request, env)) return json({ error: "Cross-origin request refused." }, 403);
  if (!env.DB) return json({ error: "Order storage is not configured." }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "We couldn't read that request." }, 400);
  }

  const sessionId = clean(body?.sessionId, 120);
  const status = String(body?.status ?? "");

  if (!sessionId || !KITCHEN_STATUSES.includes(status)) {
    return json({ error: "Unknown order or status." }, 400);
  }

  await ensureOrdersTable(env);
  const result = await env.DB.prepare(
    "UPDATE orders SET kitchen_status = ?, updated_at = ? WHERE session_id = ?",
  )
    .bind(status, Date.now(), sessionId)
    .run();

  if ((result?.meta?.changes ?? 0) === 0) {
    return json({ error: "That order isn't in the database." }, 404);
  }

  return json({ ok: true, sessionId, status, updatedAt: Date.now() });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config") {
      return handleConfig(env, url.origin);
    }
    if (url.pathname === "/api/checkout" && request.method === "POST") {
      return handleCheckout(request, env);
    }
    if (url.pathname === "/api/checkout/session" && request.method === "GET") {
      return handleSession(url, env);
    }
    if (url.pathname === "/api/stripe/webhook" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }
    if (url.pathname === "/api/order" && request.method === "GET") {
      return handleCustomerOrder(url, env);
    }
    if (url.pathname === "/api/order/reschedule" && request.method === "POST") {
      return handleCustomerReschedule(request, env);
    }
    if (url.pathname === "/api/order/cancel" && request.method === "POST") {
      return handleCustomerCancel(request, env);
    }
    if (url.pathname === "/api/kitchen/session" && request.method === "GET") {
      return handleKitchenSession(request, env);
    }
    if (url.pathname === "/api/kitchen/login" && request.method === "POST") {
      return handleKitchenLogin(request, env);
    }
    if (url.pathname === "/api/kitchen/logout" && request.method === "POST") {
      return handleKitchenLogout(request, env);
    }
    if (url.pathname === "/api/kitchen/orders" && request.method === "GET") {
      return handleKitchenOrders(request, env, url);
    }
    if (url.pathname === "/api/kitchen/order" && request.method === "GET") {
      return handleKitchenOrder(request, env, url);
    }
    if (url.pathname === "/api/kitchen/orders/status" && request.method === "POST") {
      return handleKitchenStatus(request, env);
    }
    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found." }, 404);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const looksLikeRoute = !url.pathname.includes(".");

    // Deliver the app shell for extension-less routes regardless of the
    // Accept header, so link previews and plain HTTP clients get the site
    // instead of a 404. Missing files (with an extension) still 404.
    if (request.method !== "GET" || !looksLikeRoute) {
      return response;
    }

    return env.ASSETS.fetch(
      new Request(new URL("/index.html", url), {
        method: "GET",
        headers: request.headers,
      }),
    );
  },
};
