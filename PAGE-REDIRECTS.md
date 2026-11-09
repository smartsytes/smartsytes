# Redirect map — the old site's pages, posts and broken URLs

Companion to [`WOO-RETIREMENT.md`](WOO-RETIREMENT.md). Map file: [`artifacts/page-redirects.csv`](artifacts/page-redirects.csv) — 17 rows, same column format as the product map, so both can be loaded together.

Scope note: these URLs live on **daqsandoxtails.com** (the WordPress site). The domain being replaced by the new build is **daqsandoxtailstx.com** (Owner.com), which is a separate host with its own redirect need. Both eventually point at the same new pages.

## What the seven pages actually contain

Measured, not assumed:

| Page | Status | What is really there |
| --- | --- | --- |
| `/` | 200 | Elementor homepage, "Serving The Vibe & Flavor" |
| `/about-us/` | 200 | Real "Our Story" copy — worth preserving in spirit |
| `/contact-us/` | 200 | Real phone `(972) 292-9771`, address, FAQ — but the form is labelled **"Contact Form Demo (#6)"** |
| `/catering/` | 200 | Daq Pack + catering copy |
| `/events/` | 200 | An empty calendar widget; the only entries are two **past** posts from Sept 2025 |
| `/careers/` | 200 | **Theme lorem ipsum** — "Why Work at Tokyoku Nunc et dignissim nisi. Vivamus dignissim quis risus nec…" |
| `/blog/` | 200 | 4 brand essays; the 2 event posts are not listed |

Two things worth recording while they are still visible: every page carries **"This is a demo store for testing purposes — no orders shall be fulfilled"** (the WooCommerce demo-store notice was never turned off), and the footer's **Menu** and **My Account** links both point at **404s**. The template was never finished, which is the real argument for the switch.

## The map

### The seven pages

| Old URL | Destination | Why |
| --- | --- | --- |
| `/` | *(no redirect)* | The new `/` simply replaces it. Do not add a row — a 301 from home to home is noise |
| `/about-us/` | `/about` | Direct equivalent |
| `/contact-us/` | `/visit` | Address, phone, map, hours and FAQ all live there |
| `/catering/` | `/catering` | Direct equivalent |
| `/events/` | `/catering` | No upcoming events exist; catering is the only page that handles event enquiries |
| `/careers/` | `/about` | Nothing to preserve — it is placeholder text. **410 Gone is equally defensible** if you would rather it fade |
| `/blog/` | `/about` | The brand-story role moves to `/about` |

### Utility URLs that are already broken or dead-ended

| Old URL | Status today | Destination |
| --- | --- | --- |
| `/menu/` | **404** (footer nav links here) | `/menu` — this actually fixes a broken link |
| `/shop/` | 200, 59 products, no checkout | `/menu` |
| `/cart/` | 404 | `/menu` |
| `/checkout/` | 404 | `/menu` |
| `/my-account/` | 404 (footer links here) | `/menu` |
| `/product-category/*` | — | `/menu` (prefix rule, layer 2 only) |

### The six posts

| Post | Destination |
| --- | --- |
| `from-the-kitchen-to-your-table-the-journey-of-our-delicious-oxtails` | `/menu#oxtails` |
| `the-secret-to-our-mouthwatering-oxtails-slow-cooked-perfection` | `/menu#oxtails` |
| `the-perfect-pair-why-oxtails-and-daiquiris-are-a-match-made-in-heaven` | `/menu#frozen-daqs` |
| `more-than-just-a-meal-the-daqs-and-oxtails-experience` | `/about` |
| `spades-tournament-html` | `/catering` |
| `boots-on-da-ground-html` | `/catering` |

All 17 sources were checked: 13 return 200, 4 are the already-404 pages above. Nothing in the map points at a URL that does not exist.

## Two content gaps to decide before shipping

1. **No contact form on the new site.** `/visit` gives phone, address, map, hours and FAQ, but a visitor who wants to *write* has no form — the old page had one (labelled demo). Either accept phone-only, or route `/contact-us/` to `/catering` (which has a form) and add a general-enquiry form to `/visit` later.
2. **The 4 blog essays disappear.** The 301s keep the link equity but not the content. If organic traffic to those oxtail posts matters, port the two oxtail pieces as short `/about` or `/menu` sections rather than keeping a whole blog.

## Implementation

Same three layers as the products — Worker map, Cloudflare Bulk Redirects, or temporary WordPress rule. Nothing here needs to wait for the WooCommerce decision; the page map can ship in the same change as the product map.

For a single Cloudflare upload, merge the two files into one list without duplicating the header:

```bash
{ head -1 artifacts/woo-redirects.csv; tail -n +2 artifacts/woo-redirects.csv; tail -n +2 artifacts/page-redirects.csv; } > artifacts/redirects-all.csv
```

That yields **76 rows, 76 unique sources, 0 duplicates**.

## Verification

```bash
while IFS=, read -r src target code _; do
  [ "$src" = "source_url" ] && continue
  got=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "$src")
  case "$got" in 301*) ;; *) echo "FAIL $src -> $got";; esac
done < artifacts/page-redirects.csv
```

Expect 17/17 to pass once the redirects are live on the host that answers for `daqsandoxtails.com`. Until then the WordPress install answers, and this file is a plan.

## Not covered here

- **`/feed/`, `/wp-json/`, `/sitemap_index.xml`** — WordPress artefacts. The new site should serve its own `sitemap.xml` and `robots.txt`; that is a separate task from redirects.
- **Owner.com URLs on `daqsandoxtailstx.com`** — that host is the one currently standing in front of the brand; its paths need the same treatment once they are known.
