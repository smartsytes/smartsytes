/**
 * Build-time stand-in for `src/lib/serving.ts` on the cPanel variant.
 *
 * The ordering build asks `/api/config` whether an API answered, because one
 * bundle has to serve both hosts. The cPanel build is only ever plain files, so
 * the answer is known at build time — and the probe, along with every screen
 * that depends on it, drops out of the bundle.
 */
export type Serving = "checking" | "live" | "static";

export function useServing(): Serving {
  return "static";
}

export function useOrderingAvailable(): boolean {
  return false;
}
