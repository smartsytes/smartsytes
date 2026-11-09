# WordPress plugin audit — `daqsandoxtails.com`

Evidence-based audit of the old WordPress site, 9 Nov 2026. Built from public signals rather than admin access, so every row cites what was measured. Anything invisible from outside (inactive plugins, snippet contents, POS usage) is listed at the end as **needs admin confirmation** instead of being guessed.

## Method

- Active plugin fingerprints from `/wp-json/` REST namespaces (54 registered) — a plugin that registers routes is loaded.
- Rendered markup per page (`/`, `/about-us/`, `/contact-us/`, `/catering/`, `/blog/`, `/shop/`) for CSS/JS enqueues and actual widget output.
- Store API (`/wp-json/wc/store/products`) for catalogue size, prices and purchasability.
- Sitemap and `<meta name="description">` inspection to detect two SEO plugins competing.

**"Enqueued" is not "used."** Most of these plugins load CSS/JS on every page whether or not they render anything, which is exactly the bloat worth removing.

## Keep — proven load-bearing

| Plugin | Evidence | Why removal is risky |
| --- | --- | --- |
| `solace` theme + `solace-extra` | Theme is `solace`; companion registers theme features | Layout and widgets break |
| `elementor` (4.3.6) | 693 `elementor-widget` blocks on the homepage alone | Every page is Elementor-built; layouts are stored as Elementor data |
| `elementskit-lite` | 21 `ekit-` blocks on `/catering/` | Its widgets are used at least there |
| `fluentform` | 29 references on `/contact-us/` | Removes the contact form |
| `wordpress-seo` (Yoast) | `sitemap_index.xml` served from `wordpress-seo/css/main-sitemap.xsl` | Sitemap disappears; Google loses the map |
| `ithemes-security` (Solid Security) | `ithemes-security/v1` + `/rpc` | Security hardening, login protection |
| `wp-mail-smtp` | `wp-mail-smtp/setup-wizard/v1` | Contact-form mail may stop delivering |
| `instagram-feed` (Smash Balloon) | 19 `sbi_item` elements render on `/about-us/` | The feed visibly exists there |

`ai1wm` (All-in-One WP Migration) and `code-snippets` are **keep until audited**: the first is your backup path, the second may hold PHP that runs the site. Never delete Code Snippets without exporting its snippets first.

## Remove — deactivate first, then delete

| Plugin | Evidence | Note |
| --- | --- | --- |
| `slim-seo` + `slim-seo-redirection` | Second SEO plugin: pages emit **two** `<meta name="description">` tags (`/`, `/about-us/`, `/contact-us/`) while Yoast owns the sitemap | Duplicate meta descriptions are an active SEO bug. Export its redirects before deleting — Slim SEO stores them in its own table |
| `wpforms` | `wpforms/v1` namespace registered, but **0** WPForms markup on any page; the contact page uses Fluent Forms | Idle second form plugin |
| `custom-facebook-feed` | Assets on every page, **0** rendered items | |
| `custom-twitter-feeds` | Assets on every page, **0** rendered items | |
| `feeds-for-tiktok` | Assets on every page, **0** rendered items | |
| `feeds-for-youtube` | Assets on every page, **0** rendered items | |
| `reviews-feed` | Assets on every page, **0** rendered items | |
| `wp-maintenance` | **0** markers, homepage returns 200 | Plugin appears inactive already |
| `surecart` | `surecart-webhook/v1` registered, **0** front-end assets or markup | Installed, not deployed |
| `jetpack` | `jetpack/v4` registered, **0** front-end assets | Check whether Stats/backups are actually used |

## Decide before removing — tied to WooCommerce

| Plugin | Evidence | Decision needed |
| --- | --- | --- |
| `woocommerce` | **59 products** live and priced (`Daqs Sweet Potato Mini`, $5.99, purchasable), all permalinks 200 | Catalogue is public and indexable, but there is **no cart or checkout**: 7 pages total, none of them cart/checkout, and `/cart/`, `/checkout/`, `/my-account/` all 404. Ordering runs through Clover |
| `wc-pos` (`wc/pos/v1/catalog`) | Registered | **WooCommerce POS is installed** — if walk-in sales are rung up on it, Woo cannot be removed |
| `wc-stripe` | `wc-stripe/v1` registered | Payment gateway with nothing to check out; idle unless POS/online checkout returns |
| `ti-woocommerce-wishlist` | 14 `tinvwl` references per page, 158 on `/shop/` | A wishlist for a shop that cannot check out |

If POS is unused, the sequence is: set the 59 product URLs to redirect (or let the new site absorb them), then remove WooCommerce, its Stripe gateway, POS and the wishlist together.

## Unknown — identify in wp-admin

| Namespace | Guess | Why it matters |
| --- | --- | --- |
| `nv/migration`, `nv/v1/dashboard`, `nv/v1/posts` | Unidentified "nv" plugin | Registers a dashboard and migration routes; could be a theme/importer tool |
| `nftb-telegram` | Telegram notifier | Might be sending order or form alerts — check before removing |
| `mcp`, `wp-abilities/v1` | MCP / AI integration | Newer addition; confirm nobody relies on it |
| `nps-survey/v1` | Survey widget | Harmless, but noise |

## Needs admin confirmation (invisible from outside)

1. **The plugin list itself** — inactive plugins register no routes and enqueue nothing, so they cannot appear in any of the evidence above:
   ```
   wp plugin list --fields=name,status,version
   ```
   or copy the Plugins screen.
2. **WooCommerce POS usage** — any in-store sales rung through Woo?
3. **Slim SEO redirects** — if redirects were created there, they need exporting first.
4. **Code Snippets contents** — export before touching the plugin.
5. **Jetpack modules** — Stats, backups, or neither?

## Safe removal order

1. Full backup: database + `wp-content` (UpdraftPlus, All-in-One WP Migration, or host snapshot).
2. Deactivate one plugin at a time, in the order above, clearing any cache between.
3. After each deactivation, load `/`, `/menu/`, `/about-us/`, `/contact-us/`, `/catering/`, `/shop/` and check for broken layout, missing form, console errors.
4. Delete only after a few days of clean running.
5. Re-check `/sitemap_index.xml` and confirm each page has exactly **one** meta description.

Removing the five unused social-feed plugins and the wishlist is the biggest win: they add assets to every page load while rendering nothing.
