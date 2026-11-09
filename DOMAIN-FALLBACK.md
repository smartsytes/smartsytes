# Domain fallback — `daqsandoxtailstx.com` → live site

Written 9 Nov 2026, after measured verification of the domain.

## Where things stand

The new site is live and healthy at:

```
https://site-6ad2266875494229b2ada07df20b8517.freebuff.page
```

The domain does **not** serve it. Measured, not assumed:

| Fact | Measured value |
| --- | --- |
| Authoritative nameservers | `ns1.ownerdns.com`, `ns2`, `ns3`, `ns4` — Owner.com's DNS |
| Apex `A` records | `162.159.140.177`, `172.66.0.175` — Owner.com's proxied edge |
| Apex response | `200`, `x-powered-by: Owner.com` — their marketing site |
| `www` | `308` → apex (correct shape, wrong destination) |
| Certificate | Valid: `CN=daqsandoxtailstx.com`, Google Trust Services `WE1`, to 4 Feb 2027 |
| Worker with `Host: daqsandoxtailstx.com` | `403` — the Worker rejects hostnames it was not told about |
| Platform records | both environments report `domain: freebuff.page`, no domain attached |

Two independent things are missing: the platform has not attached the hostname, and DNS still points at Owner.com. A DNS change alone cannot fix this — see "Why a CNAME will not work" below.

## Fallback A — redirect at Owner.com's edge (works today)

Owner.com controls this domain's DNS and edge, so they are the only party who can redirect it without moving nameservers. Ask them — or use their domain settings — for:

- **apex** `daqsandoxtailstx.com` and **www** `www.daqsandoxtailstx.com`
- **Permanent redirect, status 301** (not 302 — this is a permanent move and search engines should follow it)
- **Destination:** `https://site-6ad2266875494229b2ada07df20b8517.freebuff.page`
- **Path handling:** preserve the path and query if their tool supports it, so `/menu` → `/menu`. If it only supports a flat redirect, send everything to the destination root; the site is a single-page app and will still load.

Result: the domain keeps its certificate and redirects every visitor to the live site in one hop. No platform attach required.

## Fallback B — redirect in Cloudflare, if the zone moves there

If the nameservers are moved to Cloudflare (which is also what a proper attach usually wants), a single Redirect Rule covers both hosts:

```
(http.host eq "daqsandoxtailstx.com" or http.host eq "www.daqsondoxtailstx.com")
```

Dynamic target, status 301, preserve query string:

```
concat("https://site-6ad2266875494229b2ada07df20b8517.freebuff.page", http.request.uri.path)
```

## Why a CNAME will not work

```
daqsandoxtailstx.com.  CNAME  site-6ad2266875494229b2ada07df20b8517.freebuff.page
```

Tested twice: requesting the Worker with `Host: daqsandoxtailstx.com` returns **403**, and an unrelated host returns **403** as well, while the Worker's own hostname returns 200. The deployment only answers hostnames the platform has registered. Pointing DNS at it produces an error page, not the restaurant — so do not use this record as a stopgap.

## The better outcome, if the panel can attach

If the platform registers `daqsandoxtailstx.com` against the production site, no redirect is needed at all: the domain serves the site directly, and the Worker already builds absolute links from the request origin, so receipts, kitchen tickets and customer order links follow whichever host is used. Prefer this over a redirect, and remove any redirect once it works.

## Verifying any of the above

```
npm run check:domain daqsandoxtailstx.com
```

Checks DNS, the certificate as served, the redirect chain, whether the final page is ours (title match and no `x-powered-by: Owner.com`), that the JS bundle returns 200, and that `/api/config` returns the Worker's JSON. Exit code 0 means the domain is genuinely serving the site.

Run with no arguments to check the canonical URL itself.

## Rollback

Fallback A and B are redirects only — no data, certificate or hosting changes. Deleting the rule restores Owner.com serving the domain exactly as it does now. Nothing in this project needs to change to roll back.
