import type { MenuItem } from "../../data/menu";

/**
 * Build-time stand-in for `src/components/ItemSheet.tsx` on the cPanel variant.
 *
 * The sheet exists to configure an item (add-ons, quantity, notes) before adding
 * it to the cart. Without ordering there is nothing to configure, so the shared
 * menu cards keep calling the same API and this renders nothing.
 */
export function ItemSheet(_props: { item: MenuItem | null; onClose: () => void }) {
  return null;
}
