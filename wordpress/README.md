# WordPress theme

The same marketing site as the cPanel build, packaged for WordPress: home, menu,
catering, about and visit, with the phone-order banner and no checkout, cart or
kitchen board.

## Build the uploadable zip

```bash
npm ci
npm run theme
```

That produces `artifacts/daqs-oxtails-theme.zip` and fills
`wordpress/daqs-oxtails/assets/` with the current build (both are generated, not
committed). Re-run it after any change to the site.

## Install

1. Appearance → Themes → Add New → Upload Theme.
2. Choose `daqs-oxtails-theme.zip`, then Activate.
3. Settings → Permalinks → Save (once), so the client-side routes are registered.

The theme takes over the whole front end; `wp-admin` is untouched. Existing
WordPress pages stop rendering, because every URL is answered by this app.

## How it works

- `index.php` prints `<div id="root">` and the app mounts there.
- `functions.php` finds `assets/index-*.js` / `.css` by glob, marks the script
  `type="module"`, and rewrites `/menu`, `/catering`, `/about`, `/visit`,
  `/checkout`, `/order/*` and `/kitchen*` to the shell with a 200 status.
- The build is made with `vite build --mode wp`, which uses the ordering-free
  entry and points image URLs at
  `/wp-content/themes/daqs-oxtails/assets/img/`.

## What this is not

It is not editable in the WordPress editor — the design and copy live in the
React app, so changes are made there and re-uploaded as a zip. That is the
trade-off for shipping the existing site instead of rebuilding it as PHP
templates.
