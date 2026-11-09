# Retiring WooCommerce without losing the 59 product URLs

Plan prepared 9 Nov 2026. Companion file: [`artifacts/woo-redirects.csv`](artifacts/woo-redirects.csv) — 59 ready-to-load rows.

## What is actually there

Measured from the live store:

- **59 products**, all live at `/product/<slug>/`, all returning 200, all priced and `is_purchasable: true`.
- **No cart and no checkout.** The site has 7 pages (events, catering, blog, about-us, contact-us, careers, home) and none of them is cart or checkout; `/cart/`, `/checkout/`, `/my-account/` all return 404. Ordering runs through Clover.
- **WooCommerce POS is installed** (`wc/pos/v1/catalog`), so some of those 59 may be rung up on a register.
- **The Woo prices disagree with the site's own menu grid** — Oxtail Pasta $24.99 in Woo vs $25.99 on the menu, Veggie Plate $10.99 vs $13.99, Turkey Neck Plate $27.99 vs $28.99, Gumbo $15.99, Catfish $17.99, Wings $11.99. Do **not** use this catalogue as a price source when the real prices are confirmed; it is an older list.

## Why the URLs need explicit handling

The new site is a single-page app, and the Worker falls back to `index.html` for any extension-less path it does not recognise (`deploy-worker.js` ~line 1474–1490). So `/product/oxtail-pasta/` on the new host would return **HTTP 200** with the "That plate isn't on the menu" screen. Google treats that as a **soft 404** — the URL keeps its history, gets re-crawled, and clutters the index. A 301 to a real page is strictly better here.

## Destination policy

Every old product goes to the closest real page on the new site, using the anchors the menu actually renders (`#oxtails`, `#cajun`, `#sides`, `#frozen-daqs`, `#weekday-lunch`):

| Destination | Rows | Examples |
| --- | --- | --- |
| `/menu#sides` | 14 | `candied-yams`, `collard-greens`, `cornbread`, `rice`, `side-of-sauce` |
| `/menu#cajun` | 13 | `gumbo`, `catfish`, `wings`, `oxtail-eggrolls`, `1lb-shrimp-boil` |
| `/menu#oxtails` | 13 | `oxtail-pasta`, `turkey-neck-plate-rice-yams-greens-and-cornbread`, `veggie-plate` |
| `/menu` (no counterpart) | 13 | `bottle-water`, `domestic-beer`, `lamb-chop`, `peach-cobbler`, `cake-daddy`, `smoke-chicken-salad` |
| `/menu#weekday-lunch` | 3 | `1-pc-catfish-w-fries`, `10-piece-shrimp-w-fries`, `oxtail-pasta-lunch` |
| `/menu#frozen-daqs` | 2 | `daiquiri`, `extra-shot-wine-base` |
| `/catering` | 1 | `bannana-pudding` (the pudding tray lives on the catering page) |

The 13 with no counterpart are drinks, desserts and off-menu specials. Sending them to the menu index is honest: the item is gone, but the visitor lands somewhere they can order.

## Implementation — three layers, pick by routing situation

**1. Worker-side (recommended).** A 59-entry map plus a prefix catch-all, inserted **before** the asset/SPA fallback, so it works the moment the domain attaches to the Worker and keeps working after WordPress is deleted:

```js
const WOO_PRODUCT_REDIRECTS = new Map(Object.entries({ /* slug -> "/menu#cajun" */ }));

if (url.pathname.startsWith("/product/")) {
  const slug = url.pathname.replace(/^\/product\//, "").replace(/\/$/, "");
  const target = WOO_PRODUCT_REDIRECTS.get(slug) ?? "/menu";
  return Response.redirect(new URL(target, url.origin).toString(), 301);
}
```

Because the map lives in this project, it is versioned, testable in the local harness, and cannot be lost with the WordPress installation.

**2. Cloudflare Bulk Redirects.** If the zone moves to Cloudflare, upload `artifacts/woo-redirects.csv` directly — the columns (`source_url`, `target_url`, `status_code`, `preserve_query_string`) match the list format. Add one prefix rule for the rest: `/product/*` → `/menu` (301). No Worker change needed.

**3. WordPress-side temporary rule.** If they want the old URLs redirected *before* the domain moves, that has to happen on the WordPress side, which means keeping whatever redirect plugin is already installed until the switch. This is the least attractive option because it delays plugin cleanup.

## Order of operations

1. **Gate: confirm WooCommerce POS usage.** If walk-in sales ring through Woo, stop — Woo stays, and only `/shop/` and product pages need a front-end redirect, not a plugin removal.
2. Export before deleting anything: orders and customers (CSV), product list (the Store API dump is already captured), `wp-content/uploads/woocommerce_uploads/`, product reviews, and a full database backup.
3. Install the redirects (layer 1 or 2) and verify — deleting the plugin first is what creates the dead ends.
4. Confirm no orders have been placed through Woo in 12 months. Stripe/Clover are where the money is; if the answer is zero, the catalogue is decorative.
5. Remove in this order, one at a time: wishlist → Woo Stripe gateway → Woo POS → WooCommerce. Watch `/shop/` and `/product/*` after each.
6. Keep the redirects in place for at least 12 months; Google needs a crawl cycle or three.

## Other legacy URLs to cover at the same time

| Old URL | Status today | Destination |
| --- | --- | --- |
| `/shop/` | 200 (product grid) | `/menu` |
| `/product-category/*` | — | `/menu` |
| `/cart/`, `/checkout/`, `/my-account/` | 404 | `/menu` (or 410) |
| `/events/` | 200 | `/catering` |
| `/careers/` | 200 | `/visit` or keep as a page |
| `/blog/` | 200 | `/about` (or keep, if the posts are wanted) |

The seven real pages are a separate decision from Woo; they hold content and links that may deserve 301s of their own.

## Verification

After the redirects are live, every source must answer `301` with a `Location` on the new host. This checks all 59 and prints any that fail:

```bash
while IFS=, read -r src target code _; do
  [ "$src" = "source_url" ] && continue
  got=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "$src")
  case "$got" in 301*) ;; *) echo "FAIL $src -> $got";; esac
done < artifacts/woo-redirects.csv
```

Run it once with `src` rewritten to the new host plus a `Host:` header if testing before DNS moves, and again after the switch.

## Risks

- **Deleting Woo first** leaves 59 soft-404s; this is the whole reason for the ordering above.
- **POS in use** — removing Woo breaks the register, not just the website.
- **Product images** live under `wp-content/uploads/`, not inside the plugin; deleting the plugin does not delete the images, but the pages that displayed them vanish.
- **Old prices are wrong.** Whatever is migrated into the new catalogue must come from a confirmed price list, not this store.
