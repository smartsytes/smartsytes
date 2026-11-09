import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Addon, MenuItem } from "../data/menu";

export type CartLine = {
  key: string;
  id: string;
  name: string;
  image?: string;
  swatch?: [string, string];
  unitPrice: number;
  qty: number;
  addons: Addon[];
  notes?: string;
};

type Fulfillment = "pickup" | "delivery";

type ToastState = { id: number; message: string } | null;

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (input: {
    item: MenuItem;
    addons?: Addon[];
    qty?: number;
    notes?: string;
  }) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toast: ToastState;
  notify: (message: string) => void;
  fulfillment: Fulfillment;
  setFulfillment: (value: Fulfillment) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_KEY = "daq-cart-v1";
const FULFILLMENT_KEY = "daq-fulfillment-v1";

const isCartLine = (value: unknown): value is CartLine => {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<CartLine>;
  return (
    typeof line.key === "string" &&
    typeof line.id === "string" &&
    typeof line.name === "string" &&
    typeof line.unitPrice === "number" &&
    typeof line.qty === "number" &&
    Array.isArray(line.addons)
  );
};

const readCart = (): CartLine[] => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() =>
    typeof window === "undefined" ? [] : readCart(),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [fulfillment, setFulfillmentState] = useState<Fulfillment>(() => {
    try {
      return localStorage.getItem(FULFILLMENT_KEY) === "delivery"
        ? "delivery"
        : "pickup";
    } catch {
      return "pickup";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable — cart stays in memory */
    }
  }, [lines]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  const add = useCallback(
    ({
      item,
      addons = [],
      qty = 1,
      notes = "",
    }: {
      item: MenuItem;
      addons?: Addon[];
      qty?: number;
      notes?: string;
    }) => {
      const trimmedNotes = notes.trim();
      const key = [item.id, ...addons.map((addon) => addon.id).sort(), trimmedNotes]
        .filter(Boolean)
        .join("|");
      const unitPrice =
        item.price + addons.reduce((sum, addon) => sum + addon.price, 0);

      setLines((current) => {
        const existing = current.find((line) => line.key === key);
        if (existing) {
          return current.map((line) =>
            line.key === key ? { ...line, qty: line.qty + qty } : line,
          );
        }
        return [
          ...current,
          {
            key,
            id: item.id,
            name: item.name,
            image: item.image,
            swatch: item.swatch,
            unitPrice,
            qty,
            addons,
            notes: trimmedNotes || undefined,
          },
        ];
      });

      notify(`${item.name} added to your order`);
    },
    [notify],
  );

  const setQty = useCallback((key: string, qty: number) => {
    setLines((current) =>
      qty <= 0
        ? current.filter((line) => line.key !== key)
        : current.map((line) => (line.key === key ? { ...line, qty } : line)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const setFulfillment = useCallback((value: Fulfillment) => {
    setFulfillmentState(value);
    try {
      localStorage.setItem(FULFILLMENT_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = lines.reduce(
      (sum, line) => sum + line.unitPrice * line.qty,
      0,
    );

    return {
      lines,
      count,
      subtotal,
      add,
      setQty,
      remove,
      clear,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toast,
      notify,
      fulfillment,
      setFulfillment,
    };
  }, [
    lines,
    add,
    setQty,
    remove,
    clear,
    isOpen,
    toast,
    notify,
    fulfillment,
    setFulfillment,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
