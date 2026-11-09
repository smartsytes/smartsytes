import { useEffect, useState } from "react";

/**
 * How this copy of the site is being served.
 *
 * "live"   — the Worker is answering, so ordering, receipts and the kitchen
 *            board exist.
 * "static" — only files are being served (cPanel/Apache upload, a preview
 *            host without the API). The marketing pages work; ordering does
 *            not, so every order entry point is hidden instead of failing.
 * "checking" — the probe has not answered yet; assume live so nothing flickers.
 */
export type Serving = "checking" | "live" | "static";

// One shared probe for the whole page. The Worker answers /api/config with
// JSON; on a static host the SPA fallback answers with the HTML shell, which is
// the signal we detect (checking the content type, not just the status code).
let probe: Promise<Serving> | null = null;

function detect(): Promise<Serving> {
  if (!probe) {
    probe = (async (): Promise<Serving> => {
      try {
        const response = await fetch("/api/config", {
          headers: { accept: "application/json" },
        });
        if (!response.ok) return "static";
        const type = response.headers.get("content-type") ?? "";
        if (!type.includes("application/json")) return "static";
        const config: unknown = await response.json();
        return config && typeof config === "object" ? "live" : "static";
      } catch {
        return "static";
      }
    })();
  }
  return probe;
}

export function useServing(): Serving {
  const [mode, setMode] = useState<Serving>("checking");

  useEffect(() => {
    let active = true;
    detect().then((value) => {
      if (active) setMode(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return mode;
}

/** True when order entry points should be shown. */
export function useOrderingAvailable(): boolean {
  return useServing() !== "static";
}
