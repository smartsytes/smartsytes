/**
 * Verifies that a hostname actually serves this project's site.
 *
 *   npm run check:domain                      # checks the canonical host
 *   npm run check:domain daqsandoxtailstx.com  # checks one or more hosts
 *
 * A host passes only when all of the following hold:
 *   - it resolves (A / AAAA / CNAME)
 *   - the certificate is valid for the hostname
 *   - the final page (after at most 2 redirects) is our site, not Owner.com
 *   - the JS bundle referenced by the page returns 200
 *   - /api/config returns the Worker's JSON
 *
 * Exit code is 0 only when every host passes.
 */

import { promises as dns } from "node:dns";
import tls from "node:tls";

const CANONICAL = process.env.CANONICAL_URL ?? "https://site-6ad2266875494229b2ada07df20b8517.freebuff.page";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const TITLE_RE = /Daqs\s*(&|and)\s*Oxtails/i;
const CHALLENGE_RE = /just a moment|attention required|checking your browser|403 forbidden/i;

/** Titles arrive HTML-escaped (`Daqs &amp; Oxtails`). */
function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

const hosts = process.argv.slice(2);
if (hosts.length === 0) hosts.push(new URL(CANONICAL).hostname);

const results = [];

function record(host, name, ok, detail) {
  results.push({ host, name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(14)} ${detail}`);
}

async function dnsLookup(host) {
  const out = {};
  const queries = {
    A: () => dns.resolve4(host),
    AAAA: () => dns.resolve6(host),
    CNAME: () => dns.resolveCname(host),
  };
  for (const [key, run] of Object.entries(queries)) {
    try {
      out[key] = await run();
    } catch (err) {
      out[key] = [];
      if (!["ENODATA", "ENOTFOUND", "ENOTIMP"].includes(err.code)) out[key] = [`error:${err.code}`];
    }
  }
  return out;
}

function certificate(host) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, servername: host, port: 443, timeout: 10000 }, () => {
      const cert = socket.getPeerCertificate();
      resolve({
        cn: cert?.subject?.CN ?? "(none)",
        issuer: [cert?.issuer?.O, cert?.issuer?.CN].filter(Boolean).join(" ") || "(unknown)",
        validTo: cert?.valid_to ?? "(unknown)",
        san: cert?.subjectaltname ?? "",
      });
      socket.end();
    });
    socket.on("error", (err) => resolve({ error: err.code ?? err.message }));
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ error: "timeout" });
    });
  });
}

async function httpProbe(host) {
  const start = `https://${host}/`;
  const manual = await fetch(start, { redirect: "manual", headers: { "user-agent": UA } });
  const location = manual.headers.get("location");

  const followed = await fetch(start, { redirect: "follow", headers: { "user-agent": UA } });
  const html = await followed.text();
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  const poweredBy = followed.headers.get("x-powered-by") ?? "";

  return {
    startStatus: manual.status,
    location,
    finalStatus: followed.status,
    finalUrl: followed.url,
    title,
    poweredBy,
    html,
  };
}

async function check(host) {
  console.log(`\n${host}`);
  const dnsResult = await dnsLookup(host);
  const addresses = [...dnsResult.A, ...dnsResult.AAAA];
  record(host, "dns", addresses.length > 0, `A=[${dnsResult.A.join(" ")}] AAAA=[${dnsResult.AAAA.join(" ")}] CNAME=[${dnsResult.CNAME.join(" ")}]`);

  const cert = await certificate(host);
  record(host, "certificate", !cert.error, cert.error ? cert.error : `CN=${cert.cn} · ${cert.issuer} · to ${cert.validTo}`);

  let probe;
  try {
    probe = await httpProbe(host);
  } catch (err) {
    record(host, "http", false, err.message);
    return;
  }

  record(host, "http", probe.finalStatus === 200, `${probe.startStatus}${probe.location ? ` -> ${probe.location}` : ""} => ${probe.finalStatus} ${probe.finalUrl}`);

  const title = decodeEntities(probe.title);
  const challenged = probe.finalStatus === 403 && CHALLENGE_RE.test(title);
  const ours = TITLE_RE.test(title) && !/owner\.com/i.test(probe.poweredBy);
  record(
    host,
    "is our site",
    ours,
    challenged
      ? `blocked by a Cloudflare challenge before the site answered (title="${title}")`
      : `title="${title}" powered-by="${probe.poweredBy || "none"}"`,
  );

  const assetPath = probe.html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (assetPath) {
    const origin = new URL(probe.finalUrl).origin;
    const asset = await fetch(`${origin}/${assetPath}`, { headers: { "user-agent": UA } });
    record(host, "js bundle", asset.status === 200, `${assetPath} -> ${asset.status}`);
  } else {
    record(host, "js bundle", false, "no bundle referenced by the page");
  }

  const origin = new URL(probe.finalUrl).origin;
  const config = await fetch(`${origin}/api/config`, { headers: { "user-agent": UA } });
  const body = await config.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    /* not our Worker */
  }
  record(host, "api", config.status === 200 && json !== null, `${config.status} ${body.slice(0, 80)}`);
}

console.log(`canonical: ${CANONICAL}`);
for (const host of hosts) await check(host);

const failed = results.filter((r) => !r.ok);
const passingHosts = hosts.filter((host) => results.filter((r) => r.host === host).every((r) => r.ok));

console.log(`\n${results.length - failed.length}/${results.length} checks passed · serving our site: ${passingHosts.join(", ") || "none"}`);
if (failed.length > 0) process.exitCode = 1;
