# Online ordering

Customers pay on Stripe's hosted checkout. When a payment succeeds, Stripe calls
the site's webhook, the order is written to D1, and the kitchen gets an email
(and optionally a text).

```
/menu → cart → POST /api/checkout → Stripe Checkout
                                        ↓ payment
                        POST /api/stripe/webhook → D1 `orders` → email/SMS
                                        ↓ redirect
                              /checkout/success
```

## Prices

Prices live in `src/data/menu.ts`. The build generates `dist/catalog.json` from
that file, and the Worker prices every order from the catalog — the browser
only sends item ids, add-on ids and quantities. Change a price in one place.

## Secrets

Set these in **Sites → Secrets** (never in the repo). The site keeps working
without them: checkout tells the customer to call instead, and the webhook
refuses requests it cannot verify.

| Name | Required | What it is |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | yes | `sk_live_…` (or `sk_test_…` while testing) |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_…` from the webhook endpoint you create |
| `RESEND_API_KEY` | for email | API key from resend.com |
| `KITCHEN_EMAIL` | for email | One or more addresses, comma separated |
| `ORDER_EMAIL_FROM` | optional | Verified sender, e.g. `Daqs <orders@daqsandoxtailstx.com>`; defaults to Resend's onboarding address |
| `TWILIO_ACCOUNT_SID` | for SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | for SMS | Twilio auth token |
| `TWILIO_FROM_NUMBER` | for SMS | Twilio number in E.164, e.g. `+1972…` |
| `KITCHEN_SMS_TO` | for SMS | The phone that should buzz |
| `KITCHEN_PASSWORD` | for the board | Password staff use at `/kitchen`; also signs their session cookie |

Email and SMS are independent: configure either or both. If both are set the
kitchen gets both, and a failure in one does not block the other.

When the order has an email address, the customer also gets their own email:
a receipt with every line item and the amount paid, plus a pickup or delivery
reminder (address, ready time, order number, the 21+ ID rule) and the kitchen's
number for changes. Replies go back to `KITCHEN_EMAIL`. If that send fails the
payment is still recorded and the kitchen is still alerted — the failure is
noted in `orders.customer_notified`.

## Opening hours

The site only offers pickup slots the kitchen is open for (`pickupSlots` in
`src/lib/hours.ts`), and `POST /api/checkout` re-checks the requested instant
(`whenAt`) against `SERVICE_HOURS` in the Worker. A closed time is refused with
`400 { code: "closed" }`, and "as soon as possible" is judged from the earliest
ready time (now + 40 minutes), so it is refused when the store is closed or
about to close. Nothing is charged when that happens — the check runs before
Stripe is called.

## Changing a paid order

Pickup customers get a signed link in their receipt to `/order/<session id>`,
which lets them reschedule or cancel without an account:

- `GET /api/order?sessionId=…&t=…` returns a summary — no email, phone, address
  or payment details.
- `POST /api/order/reschedule` moves the pickup time (at least 30 minutes ahead,
  within two weeks, and inside pickup hours in Central time) and emails both the
  kitchen and the customer. The hours mirror `src/lib/hours.ts` in
  `SERVICE_HOURS` in the Worker — change both when the schedule changes.
- `POST /api/order/cancel` refunds the full amount through Stripe, marks the
  order `refunded` with `kitchen_status = 'cancelled'`, and tells the kitchen not
  to prepare it. The board shows it under **Cancelled**.

The token is an HMAC over the session id, keyed by `CUSTOMER_LINK_SECRET` when
set and by `STRIPE_WEBHOOK_SECRET` otherwise — rotating either invalidates links
already sent. `CUSTOMER_LINK_SECRET` is optional but recommended, so the two
secrets can be rotated independently.

Both actions stop working once the kitchen marks the order started, and delivery
orders are changed by phone. Refunds use the `refund-<session id>` idempotency
key, so a retried cancel cannot refund twice, and a refused refund leaves the
order open instead of marking it cancelled. If `STRIPE_SECRET_KEY` is missing the
page tells the customer to call instead.

## Stripe webhook

In the Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://site-133a5ac0809f47f08da1a15c93bfe659.freebuff.page/api/stripe/webhook`
  (use the production domain once the site is published there)
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

Signature verification checks the HMAC, the timestamp (5 minute tolerance) and
uses a constant-time compare. Retries are deduplicated on the Stripe session id,
so the kitchen is alerted once per order even if Stripe delivers an event more
than once.

## Orders table

`orders` is created on the first paid order, so no migration step is needed.
Each row keeps the session id, order id, total, fulfilment type, customer name,
phone, email, address, requested time, kitchen notes, a JSON copy of the line
items and the alert result (`email`, `sms`, `not_configured`, or a failure note).

## Kitchen screen

The staff board lives at `/kitchen` (not linked from the public site, and marked
`noindex`). Sign in with `KITCHEN_PASSWORD`; the session is a signed, HttpOnly,
SameSite=Strict cookie that lasts 12 hours and is signed with that password, so
changing the password signs everyone out.

The board polls every 15 seconds while the tab is visible and shows every paid
order with its items, customer, phone, fulfilment type, requested time and
kitchen notes. Staff can mark an order **Start cooking**, **Mark complete** or
**Reopen** it. Each change is written to `orders.kitchen_status`; failures roll
the card back and show an error rather than pretending the change saved.

Each card links to a printable ticket (`/kitchen/ticket/<session id>`): one
sheet, black on white, with the order number set large, the items, the kitchen
notes boxed, the customer's phone, the ready time and a QR that reopens the
ticket on a phone. The site header and footer are hidden when printing, so the
sheet is just the ticket.

Repeated wrong passwords are throttled (6 attempts, then a 10 minute lockout per
IP). That counter lives in the Worker isolate, so it slows guessing rather than
guaranteeing a global limit — use a long password and rotate it if the link
leaks.

## Checks

```bash
npm run check:checkout   # pricing, validation, session lookup (Stripe stubbed)
npm run check:webhook    # signatures, storage, dedupe, alert payloads
npm run check:kitchen    # login, cookie signing, listing, status changes
```

Both run against the real Worker code with the providers stubbed, so they need
no accounts or network access.
