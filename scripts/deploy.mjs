/**
 * One-command release: build the site, then stage the two folders each host needs.
 *
 *   npm run deploy
 *
 *   dist/         → cPanel / any Apache host. Keeps .htaccess, which is what makes
 *                   the plain-file copy hide ordering instead of offering a
 *                   checkout that cannot work there.
 *   dist-public/  → Workers / Freebuff Sites. Public build output only; the
 *                   platform rejects hidden files and source maps, and the Worker
 *                   API replaces every rule .htaccess was providing.
 *
 * Both folders are rebuilt from the same source in one pass, so the two copies
 * can never drift. This script builds and stages; it never uploads or publishes.
 */

import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(root, "dist");
const STAGED = path.join(root, "dist-public");

const bytes = (n) => {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${n} B`;
};

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
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
  const files = await walk(dir);
  for (const file of files) {
    if (file.symlink) fail(`${label}: ${path.relative(root, file.path)} is a symlink; upload real files only`);
  }
  const size = (await Promise.all(files.map((f) => fs.stat(f.path)))).reduce((total, stat) => total + stat.size, 0);
  return { files, size };
}

// 1. Build (typecheck + vite). A failed build must stop the release.
console.log("building…\n");
const build = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
if (build.status !== 0) fail(`build failed (exit ${build.status ?? "signal"}); nothing was staged`);

// 2. Clear the old staging copy so a removed asset cannot linger.
await fs.rm(STAGED, { recursive: true, force: true });
await fs.mkdir(STAGED, { recursive: true });

// 3. Copy the build, dropping what the Worker platform rejects. Everything else
//    in dist/ is already public build output.
await fs.cp(DIST, STAGED, {
  recursive: true,
  filter: (source) => {
    const name = path.basename(source);
    if (source === DIST) return true;
    if (name.startsWith(".")) return false;
    if (name.endsWith(".map")) return false;
    return true;
  },
});

// 4. Verify what was actually produced, rather than assuming the copy worked.
const cpanel = await summarise(DIST, "cPanel copy");
const worker = await summarise(STAGED, "Worker copy");

const html = await fs.readFile(path.join(STAGED, "index.html"), "utf8").catch(() => fail("staging is missing index.html"));
const bundleRef = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? fail("index.html does not reference a JS bundle");
await fs.access(path.join(STAGED, bundleRef)).catch(() => fail(`index.html references ${bundleRef}, which was not staged`));

const htaccess = path.join(DIST, ".htaccess");
const htaccessStat = await fs.stat(htaccess).catch(() => null);
if (!htaccessStat) fail("dist/.htaccess is missing — the cPanel copy would offer ordering it cannot serve");

const leaked = worker.files.filter((file) => file.name.startsWith(".") || file.name.endsWith(".map"));
if (leaked.length > 0) fail(`staging leaked non-public files: ${leaked.map((f) => path.relative(STAGED, f.path)).join(", ")}`);

// 5. Report exactly what each host gets.
console.log(`\n✓ build          ${bundleRef}`);
console.log(`  cPanel         dist/         ${cpanel.files.length} files, ${bytes(cpanel.size)}, .htaccess included (${bytes(htaccessStat.size)})`);
console.log(`  Workers/Sites  dist-public/  ${worker.files.length} files, ${bytes(worker.size)}, no hidden files or source maps`);
console.log(`\n  upload the CONTENTS of dist/ to public_html (show hidden files), or deploy
  dist-public/ via sites.deploy.manifest.json. Same source, same bundle hash.`);
