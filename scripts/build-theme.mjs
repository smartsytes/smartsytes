#!/usr/bin/env node
/**
 * Package the ordering-free build as an uploadable WordPress theme.
 *
 *   npm run theme
 *
 * Writes the built assets into wordpress/daqs-oxtails/ and produces
 * artifacts/daqs-oxtails-theme.zip for Appearance → Themes → Add New → Upload.
 * The theme folder and the zip are both regenerated from scratch each run.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(root, "dist-wp");
const theme = path.join(root, "wordpress/daqs-oxtails");
const assets = path.join(theme, "assets");
const zip = path.join(root, "artifacts/daqs-oxtails-theme.zip");
const BASE = "/wp-content/themes/daqs-oxtails/assets/";

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

console.log("building the WordPress variant…\n");
const build = spawnSync("npm", ["run", "build:wp"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (build.status !== 0) fail("build failed; nothing was packaged");

// Rebuild the assets folder so a removed image cannot linger from a past run.
await fs.rm(assets, { recursive: true, force: true });
await fs.cp(path.join(built, "assets"), assets, { recursive: true });
await fs.cp(path.join(root, "public/img"), path.join(assets, "img"), { recursive: true });
await fs.copyFile(path.join(root, "public/favicon.svg"), path.join(assets, "favicon.svg"));

const files = await fs.readdir(assets);
const js = files.filter((name) => /^index-.*\.js$/.test(name));
const css = files.filter((name) => /^index-.*\.css$/.test(name));

if (js.length !== 1) fail(`expected one JS bundle in the theme, found ${js.length}`);
if (css.length !== 1) fail(`expected one CSS bundle in the theme, found ${css.length}`);

const code = await fs.readFile(path.join(assets, js[0]), "utf8");
if (code.includes('"/img/')) fail("the bundle still points at /img/ instead of the theme folder");
if (!code.includes(`${BASE}img/`)) fail("the bundle does not use the theme asset folder");
if (/\/api\/(config|checkout|stripe|kitchen)/.test(code)) fail("ordering code leaked into the theme build");
if (!code.includes("call the kitchen")) fail("the phone-order banner is missing from the theme build");

const images = await fs.readdir(path.join(assets, "img"));
if (images.length < 18) fail(`only ${images.length} images were copied into the theme`);

// A theme zip must contain the folder itself, not loose files.
await fs.mkdir(path.dirname(zip), { recursive: true });
await fs.rm(zip, { force: true });
const zipped = spawnSync("zip", ["-rq", zip, "daqs-oxtails"], { cwd: path.join(root, "wordpress") });
if (zipped.status !== 0) fail("zip failed — is the `zip` command installed?");

const { size } = await fs.stat(zip);
console.log(`\n✓ theme         wordpress/daqs-oxtails/`);
console.log(`  assets        ${js[0]} + ${css[0]}, ${images.length} images`);
console.log(`  checks        no /img/ root paths, no ordering code, banner present`);
console.log(`✓ upload zip    artifacts/daqs-oxtails-theme.zip (${Math.round(size / 1024)} kB)`);
