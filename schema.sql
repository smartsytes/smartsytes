-- Daqs & Oxtails order store.
-- Apply to your own D1 database with:
--   npx wrangler@latest d1 execute daqs-orders --remote --file=schema.sql
-- The Worker also creates these columns on first write, so this file is only
-- needed to pre-create the table or to inspect the schema.

CREATE TABLE IF NOT EXISTS orders (
  session_id        TEXT PRIMARY KEY,
  order_id          TEXT,
  created_at        INTEGER NOT NULL,
  amount_total      INTEGER NOT NULL,
  currency          TEXT NOT NULL,
  status            TEXT NOT NULL,
  fulfillment       TEXT,
  customer_name     TEXT,
  phone             TEXT,
  email             TEXT,
  requested_for     TEXT,
  notes             TEXT,
  address           TEXT,
  items             TEXT,
  notified          TEXT,
  customer_notified TEXT,
  kitchen_status    TEXT NOT NULL DEFAULT 'new',
  updated_at        INTEGER,
  cancelled_at      INTEGER,
  reschedule_count  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS orders_created_at ON orders (created_at DESC);
