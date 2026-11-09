import type { ReactNode } from "react";
import type { Addon, MenuItem } from "../../data/menu";

/**
 * Build-time stand-in for `src/store/cart.tsx` on the cPanel variant.
 *
 * The marketing pages share their chrome with the ordering site, so they still
 * ask for cart state (the bag count, an add button). Here that state is
 * permanently empty and the actions do nothing, which is what makes those
 * affordances disappear: the ordering store, its persistence and its toast
 * plumbing are never bundled.
 */
type AddInput = {
  item: MenuItem;
  addons?: Addon[];
  qty?: number;
  notes?: string;
};

const NO_LINES: never[] = [];

export function CartProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useCart() {
  return {
    lines: NO_LINES,
    count: 0,
    subtotal: 0,
    add: (_input: AddInput) => {},
    setQty: (_key: string, _qty: number) => {},
    remove: (_key: string) => {},
    clear: () => {},
    isOpen: false,
    openCart: () => {},
    closeCart: () => {},
    toast: null as { id: number; message: string } | null,
    notify: (_message: string) => {},
    fulfillment: "pickup" as "pickup" | "delivery",
    setFulfillment: (_value: "pickup" | "delivery") => {},
  };
}
