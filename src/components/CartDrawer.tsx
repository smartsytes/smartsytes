import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { SITE } from "../data/site";
import { cn, money } from "../lib/format";
import { useBodyLock, useEscape, useFocusTrap } from "../lib/useOverlay";
import { useCart } from "../store/cart";
import { useOrderingAvailable } from "../lib/serving";
import { MenuThumb } from "./MenuThumb";

export function CartDrawer() {
  const {
    lines,
    count,
    subtotal,
    isOpen,
    closeCart,
    setQty,
    remove,
    clear,
    fulfillment,
    setFulfillment,
  } = useCart();

  const ordering = useOrderingAvailable();

  useBodyLock(isOpen);
  useEscape(isOpen, closeCart);
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(isOpen, panelRef);

  if (!isOpen || !ordering) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your order">
      <div
        onClick={closeCart}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full cursor-default bg-ink/55 backdrop-blur-[3px]"
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-labelledby="cart-title"
        className="sheet-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-2xl outline-none"
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <div>
            <p className="eyebrow text-muted">Your order</p>
            <h2 id="cart-title" className="font-display text-2xl font-semibold">
              {count > 0 ? `${count} item${count === 1 ? "" : "s"}` : "Nothing yet"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="grid size-11 place-items-center rounded-full border border-ink/15 transition hover:bg-ink hover:text-cream"
            aria-label="Close order panel"
          >
            <X className="size-4" />
          </button>
        </header>

        {count > 0 ? (
          <div className="border-b border-ink/10 px-5 py-3">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-ink/5 p-1">
              {(["pickup", "delivery"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFulfillment(mode)}
                  className={cn(
                    "rounded-full py-2 text-[0.78rem] font-bold capitalize transition",
                    fulfillment === mode
                      ? "bg-ink text-cream shadow-sm"
                      : "text-ink/60 hover:text-ink",
                  )}
                >
                  {mode === "pickup" ? "Pickup" : "Delivery"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5">
          {count === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-cream-2 text-royal">
                <ShoppingBag className="size-7" strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold">
                  Your bag is empty
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Oxtails, gumbo, daqs — the hard part is choosing.
                </p>
              </div>
              <Link
                to="/menu"
                onClick={closeCart}
                className="btn btn-ink btn-sm mt-2"
              >
                Browse the menu <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-ink/8">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-3 py-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-cream-2">
                    <MenuThumb item={{ ...line, category: "", description: "", price: 0 }} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[0.9rem] font-semibold leading-snug">
                        {line.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => remove(line.key)}
                        className="grid size-9 place-items-center rounded-full text-muted transition hover:text-clay"
                        aria-label={`Remove ${line.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {line.addons.length > 0 ? (
                      <p className="mt-0.5 text-[0.72rem] text-muted">
                        {line.addons.map((addon) => addon.label).join(" · ")}
                      </p>
                    ) : null}
                    {line.notes ? (
                      <p className="mt-0.5 line-clamp-2 text-[0.72rem] italic text-muted">
                        “{line.notes}”
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-full border border-ink/15">
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty - 1)}
                          className="grid size-9 place-items-center rounded-full text-ink/70 transition hover:text-ink"
                          aria-label={`Decrease ${line.name} quantity`}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-[0.8rem] font-bold">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty + 1)}
                          className="grid size-9 place-items-center rounded-full text-ink/70 transition hover:text-ink"
                          aria-label={`Increase ${line.name} quantity`}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="text-[0.9rem] font-bold">
                        {money(line.unitPrice * line.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {count > 0 ? (
          <footer className="border-t border-ink/10 bg-paper px-5 py-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">
                  {fulfillment === "delivery" ? "Delivery" : "Pickup"}
                </span>
                <span className="text-muted">
                  {fulfillment === "delivery" ? money(SITE.deliveryFee) : "Free"}
                </span>
              </div>
              <p className="pt-1 text-[0.68rem] text-muted">
                Tax and tip are calculated at checkout.
              </p>
            </div>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="btn btn-gold mt-4 w-full"
            >
              Checkout · {money(subtotal)}
              <ArrowRight className="size-4" />
            </Link>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={clear}
                className="text-[0.72rem] font-semibold text-muted underline-offset-4 hover:text-clay hover:underline"
              >
                Clear order
              </button>
              <Link
                to="/menu"
                onClick={closeCart}
                className="text-[0.72rem] font-semibold text-royal underline-offset-4 hover:underline"
              >
                Add more
              </Link>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
