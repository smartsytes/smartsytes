/**
 * One-command release: build the site, then stage the two folders each host needs.
 *
 *   npm run deploy
 *
 *   dist/         → cPanel / any Apache host. The ordering-free build: checkout,
 *                   the cart and the kitchen board are never compiled, so this
 *                   copy is smaller and has nothing to hide at runtime. Keeps
 *                   .htaccess, which still 404s /api/*.
 *   dist-public/  → Workers / Freebuff Sites, staged from dist-worker/ (the full
 *                   build): ordering, receipts and the kitchen board.
 *
 * Both come from the same source in one pass, so prices, copy and design can
 * never drift. This script builds and stages; it never uploads or publishes.
 */

import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CPANEL = path.join(root, "dist");
const WORKER = path.join(root, "dist-worker");
const STAGED = path.join(root, "dist-public");

const bytes = (n) => {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${n} B`;
};

// Chunk names that only the ordering build can produce.
const ORDERING_CHUNKS = /(Kitchen|Checkout|OrderManage|CartDrawer|MobileCartBar|ItemSheet)/;

// Strings that only exist in ordering/kitchen code — routes and UI copy, never
// marketing prose (the menu page does say "give the kitchen a call").
const ORDERING_MARKERS = [
  "/api/checkout",
  "/api/config",
  "/api/stripe",
  "/api/kitchen",
  "Add to order",
  "window.print",
  "qrcode",
];

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function run(script, label) {
  console.log(`\n${label}`);
  const result = spawnSync("npm", ["run", script], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    fail(`${script} failed (exit ${result.status ?? "signal"}); nothing was staged`);
  }
}

async function walk(dir) {
  const found = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push({ path: full, name: entry.name, dir: path.relative(dir, full), symlink: entry.isSymbolicLink() });
  }
  return found;
}

async function summarise(dir, label) {
  const files = await walk(dir).catch(() => fail(`${label}: ${path.relative(root, dir)} was not built`));
  for (const file of files) {
    if (file.symlink) fail(`${label}: ${path.relative(root, file.path)} is a symlink; upload real files only`);
  }
  const size = (await Promise.all(files.map((f) => fs.stat(f.path)))).reduce((total, stat) => total + stat.size, 0);
  return { files, size };
}

async function scriptBytes(dir, files) {
  const scripts = files.filter((file) => file.name.endsWith(".js"));
  const sizes = await Promise.all(scripts.map((file) => fs.stat(file.path)));
  return sizes.reduce((total, stat) => total + stat.size, 0);
}

async function entryBundle(dir, label) {
  const html = await fs.readFile(path.join(dir, "index.html"), "utf8").catch(() =>
    fail(`${label}: index.html is missing`),
  );
  const ref = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? fail(`${label}: index.html has no JS bundle`);
  await fs.access(path.join(dir, ref)).catch(() => fail(`${label}: index.html references ${ref}, which was not built`));
  return ref;
}

// 1. Build both variants from the same source. A failed build must stop the release.
run("build", "building the Worker copy (full app)…");
run("build:cpanel", "building the cPanel copy (no ordering)…");

// 2. Clear the old staging copy so a removed asset cannot linger, then stage the
//    full build, dropping what the Worker platform rejects.
await fs.rm(STAGED, { recursive: true, force: true });
await fs.mkdir(STAGED, { recursive: true });
await fs.cp(WORKER, STAGED, {
  recursive: true,
  filter: (source) => {
    const name = path.basename(source);
    if (source === WORKER) return true;
    if (name.startsWith(".")) return false;
    if (name.endsWith(".map")) return false;
    return true;
  },
});

const cpanel = await summarise(CPANEL, "cPanel copy");
const workerBuild = await summarise(WORKER, "Worker copy");
const staged = await summarise(STAGED, "Worker copy");

// 3. Both builds must be complete before anything is considered shippable.
const cpanelBundle = await entryBundle(CPANEL, "cPanel copy");
const workerBundle = await entryBundle(WORKER, "Worker copy");
await fs.access(path.join(WORKER, "catalog.json")).catch(() =>
  fail("the Worker build is missing catalog.json; the Worker prices orders from it"),
);

// 4. The whole point of the cPanel copy: no ordering code reaches it.
const strays = cpanel.files.filter((file) => ORDERING_CHUNKS.test(file.name));
if (strays.length > 0) {
  fail(`the cPanel build still ships ordering chunks: ${strays.map((f) => path.relative(CPANEL, f.path)).join(", ")}`);
}

await fs.access(path.join(CPANEL, "catalog.json")).then(
  () => fail("the cPanel build contains catalog.json; it has no ordering to price"),
  () => undefined,
);

const leaks = [];
for (const file of cpanel.files.filter((entry) => entry.name.endsWith(".js"))) {
  const text = await fs.readFile(file.path, "utf8");
  for (const marker of ORDERING_MARKERS) {
    if (text.includes(marker)) leaks.push(`${path.relative(CPANEL, file.path)} → ${marker}`);
  }
}
if (leaks.length > 0) {
  fail(`the cPanel bundle still contains ordering code:\n  ${leaks.join("\n  ")}`);
}

// 5. …and the full build must still contain everything it is supposed to.
const hasChunk = (pattern) => workerBuild.files.some((file) => pattern.test(path.relative(WORKER, file.path)));
if (!hasChunk(/(^|\/)Kitchen-[^/]*\.js$/)) fail("the Worker build lost its Kitchen chunk");
if (!hasChunk(/(^|\/)KitchenTicket-[^/]*\.js$/)) fail("the Worker build lost its KitchenTicket chunk");

const cpanelScripts = await scriptBytes(CPANEL, cpanel.files);
const workerScripts = await scriptBytes(WORKER, workerBuild.files);
if (cpanelScripts >= workerScripts) {
  fail(`the cPanel build is not smaller (${bytes(cpanelScripts)} of JS vs ${bytes(workerScripts)})`);
}

// 6. The cPanel copy is useless on Apache without `.htaccess`, which is what
//    hides /api and gives the SPA its fallback.
const htaccess = path.join(CPANEL, ".htaccess");
const htaccessStat = await fs.stat(htaccess).catch(() => null);
if (!htaccessStat) fail("dist/.htaccess is missing — the cPanel copy would offer ordering it cannot serve");

const leakedToStaging = staged.files.filter((file) => file.name.startsWith(".") || file.name.endsWith(".map"));
if (leakedToStaging.length > 0) {
  fail(`staging leaked non-public files: ${leakedToStaging.map((f) => path.relative(STAGED, f.path)).join(", ")}`);
}

// 7. Report exactly what each host gets.
const saved = workerScripts - cpanelScripts;
const percent = Math.round((saved / workerScripts) * 100);
console.log(`\n✓ Worker build   ${workerBundle}`);
console.log(`  Workers/Sites  dist-public/  ${staged.files.length} files, ${bytes(staged.size)}, JS ${bytes(workerScripts)}`);
console.log(`✓ cPanel build   ${cpanelBundle}`);
console.log(`  cPanel         dist/         ${cpanel.files.length} files, ${bytes(cpanel.size)}, JS ${bytes(cpanelScripts)}`);
console.log(`  .htaccess      included (${bytes(htaccessStat.size)})  ·  ordering code left out: ${bytes(saved)} JS (${percent}%)`);
console.log(`\n  upload the CONTENTS of dist/ to public_html (show hidden files), or deploy
  dist-public/ via sites.deploy.manifest.json.`);
