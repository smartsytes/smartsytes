# Hosting this site yourself, on your own domain

Written 9 Nov 2026, from measured facts. This replaces the assumption that the
WordPress/cPanel admin account could host the new site — it cannot, and the
domain is not in that account either. Details below, then two concrete tracks.

## What this site actually is

| Piece | What it needs |
| --- | --- |
| Home, Menu, About, Visit, Catering, 404 | Static files in `dist/` — any web server |
| Online ordering, Stripe checkout + webhook | The Worker in `deploy-worker.js` — a JS runtime, not PHP |
| Orders database | D1 (SQLite) bound as `DB` |
| Kitchen board, tickets, receipts, customer reschedule/cancel | Same Worker + D1 + `KITCHEN_PASSWORD` |

`/api/checkout`, `/api/stripe/webhook`, `/api/order*` and `/api/kitchen/*` are
served by the Worker. cPanel runs Apache and PHP: it can serve the six marketing
pages, and it cannot run a single one of those endpoints. There is no PHP port
of this app, and writing one would be a rewrite, not a migration.

## Where the domain actually lives (measured today)

```
registrar         Key-Systems GmbH (Owner.com's reseller brand)
registered        2026-09-08        expires 2027-09-08
status            clientTransferProhibited
nameservers       ns1.ownerdns.com, ns2, ns3, ns4   ← Owner.com DNS
apex A            162.159.140.177, 172.66.0.175
apex response     200, x-powered-by: Owner.com
```

Two consequences:

1. **DNS is controlled by Owner.com, not by cPanel and not by WordPress admin.**
   Nothing in wp-admin can move a nameserver. Someone with the Owner.com account
   (or the registrar account) has to change the nameservers or add the records.
2. **cPanel login is therefore not the access that was needed.** It also never
   reached this chat: no WordPress or cPanel credentials arrived, and passwords
   should not be pasted into chat — they belong in a password manager.

## Track A — your own Cloudflare account (recommended: full site, your domain)

This is real self-hosting: your account, your D1 database, your secrets, your
domain, your billing relationship. Cloudflare's Workers free plan covers a
restaurant's traffic and D1 has a free tier; you can see usage in your dashboard.

### 1. Create the Worker and database

```bash
npm ci
npm run deploy                      # builds dist/ + dist-public/ and checks both
npx wrangler@latest login           # opens your browser, your account
npx wrangler@latest d1 create daqs-orders
```

Copy the printed `database_id` into `wrangler.jsonc`, replacing
`REPLACE_WITH_DATABASE_ID_FROM_D1_CREATE`.

```bash
npx wrangler@latest d1 execute daqs-orders --remote --file=schema.sql
npx wrangler@latest deploy
```

You now get `https://daqs-and-oxtails.<your-subdomain>.workers.dev`. Open it —
it should serve the restaurant immediately; checkout will still be off until
step 3.

### 2. Put the domain on it

1. Cloudflare dashboard → **Add a domain** → `daqsandoxtailstx.com` → Free plan.
2. It shows two nameservers. Give those to whoever holds the Owner.com/registrar
   account (or change them yourself at the registrar if you have that login).
3. Wait for the zone to read **Active** in Cloudflare.
4. In `wrangler.jsonc`, uncomment the `routes` block, then:

```bash
npx wrangler@latest deploy
```

Cloudflare issues the certificate and serves apex + `www` from your Worker. This
is the step that makes the domain yours; there is no way around having DNS
access somewhere.

### 3. Secrets (never in this chat, never in the repo)

```bash
npx wrangler@latest secret put STRIPE_SECRET_KEY
npx wrangler@latest secret put STRIPE_WEBHOOK_SECRET
npx wrangler@latest secret put RESEND_API_KEY
npx wrangler@latest secret put ORDER_EMAIL_FROM
npx wrangler@latest secret put KITCHEN_EMAIL
npx wrangler@latest secret put TWILIO_ACCOUNT_SID
npx wrangler@latest secret put TWILIO_AUTH_TOKEN
npx wrangler@latest secret put TWILIO_FROM_NUMBER
npx wrangler@latest secret put KITCHEN_SMS_TO
npx wrangler@latest secret put KITCHEN_PASSWORD
npx wrangler@latest secret put CUSTOMER_LINK_SECRET
```

Then in Stripe: add a webhook endpoint for
`https://daqsandoxtailstx.com/api/stripe/webhook`, subscribe to
`checkout.session.completed` (and the refund/expiry events the code handles),
and paste that endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.

`CUSTOMER_LINK_SECRET` should be a long random string (for example
`openssl rand -hex 32`); it signs the customer receipt/reschedule links.
`KITCHEN_PASSWORD` is the shared password for `/kitchen`.

### 4. Prove it

```bash
npm run check:domain daqsandoxtailstx.com     # exit 0 = the domain serves this site
curl -s https://daqsandoxtailstx.com/api/config
```

Then do one real £0-style test: place an order with a Stripe test key, confirm
the kitchen board shows it, the ticket prints, and the receipt email arrives.
Switching live keys is the same `secret put` commands with live values.

## Track B — cPanel (brochure only)

If you want the marketing pages on the existing hosting today, this works:

1. `npm ci && npm run deploy` — one command builds the site and stages both copies.
2. Upload **the contents of `dist/`** (not the folder) into `public_html/`, with
   `.htaccess` included — it is committed at `public/.htaccess`, so it is in
   `dist/` after every build. Enable "show hidden files" in File Manager or the
   file will be skipped silently.
3. The site appears at whatever domain cPanel serves, with working Home, Menu,
   About, Visit, Catering, and correct URLs on refresh.

What will **not** work there: the Place Order button, `/kitchen`, kitchen
tickets, receipts, reschedule/cancel. Those need the Worker. A static upload is
a shop window, not the restaurant's ordering system.

The static copy now hides all of that by itself: the app probes `/api/config`,
and when the answer is not JSON (the `.htaccess` above returns 404 for `/api/*`)
it removes the cart, the add buttons, the checkout and the kitchen screen, and
points pickup/delivery at the phone number. Nothing on that copy invites a
customer into a checkout that cannot work.

## What I could not do from here

- Attach the domain: the platform reports no domain on either environment, and
  the Worker returns `403` for `Host: daqsandoxtailstx.com`, so DNS pointed at
  it produces an error page instead of the site (`DOMAIN-FALLBACK.md` has the
  evidence and the redirect-only fallback).
- Change the nameservers: they are Owner.com's, behind a registrar login I do
  not have and should not be given as a chat password.
- Add your Stripe/Resend/Twilio keys: production has zero variables configured,
  which is why `/api/checkout` answers `503 stripe_not_configured`.

## Rollback

Track A changes nothing until you deploy and change nameservers. Leaving Owner.com
as-is costs nothing; moving the nameservers back restores their site. Your D1
data stays in your Cloudflare account either way.
