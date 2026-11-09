import { useRef, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import type { MenuItem } from "../data/menu";
import { cn, money } from "../lib/format";
import { useBodyLock, useEscape, useFocusTrap } from "../lib/useOverlay";
import { useCart } from "../store/cart";
import { useOrderingAvailable } from "../lib/serving";
import { MenuThumb } from "./MenuThumb";

export function ItemSheet({
  item,
  onClose,
}: {
  item: MenuItem | null;
  onClose: () => void;
}) {
  useBodyLock(Boolean(item));
  useEscape(Boolean(item), onClose);

  if (!item) return null;

  return (
    <ItemSheetBody key={item.id} item={item} onClose={onClose} />
  );
}

function ItemSheetBody({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const { add } = useCart();
  const ordering = useOrderingAvailable();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, dialogRef);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const addons = item.addons ?? [];
  const chosen = addons.filter((addon) => selected.includes(addon.id));
  const unitPrice =
    item.price + chosen.reduce((sum, addon) => sum + addon.price, 0);

  const toggleAddon = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 cursor-default bg-ink/60 backdrop-blur-[3px]"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="fade-up relative flex max-h-[94svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] bg-cream shadow-2xl outline-none sm:rounded-[1.75rem]"
      >
        <div className="relative h-44 shrink-0 overflow-hidden sm:h-52">
          <MenuThumb item={item} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-cream/90 text-ink backdrop-blur transition hover:bg-cream"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cream/70">
              {item.tags?.[0] ?? "Daqs & Oxtails"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-cream sm:text-3xl">
              {item.name}
            </h2>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[0.9rem] leading-relaxed text-muted">
              {item.description}
            </p>
            <span className="shrink-0 rounded-full bg-cream-2 px-3 py-1 text-sm font-bold">
              {money(item.price)}
            </span>
          </div>

          {ordering && addons.length > 0 ? (
            <fieldset>
              <legend className="label">Make it yours</legend>
              <div className="space-y-2">
                {addons.map((addon) => {
                  const isOn = selected.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm transition",
                        isOn
                          ? "border-royal bg-royal/5"
                          : "border-ink/10 bg-paper hover:border-ink/25",
                      )}
                    >
                      <span className="flex items-center gap-2.5 font-medium">
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-md border transition",
                            isOn
                              ? "border-royal bg-royal text-cream"
                              : "border-ink/25 bg-transparent text-transparent",
                          )}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        {addon.label}
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isOn}
                          onChange={() => toggleAddon(addon.id)}
                        />
                      </span>
                      <span className="font-semibold text-muted">
                        +{money(addon.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {ordering ? (
            <div>
              <label className="label" htmlFor="item-notes">
                Special instructions
              </label>
              <textarea
                id="item-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Extra sauce on the side, no peppers…"
                className="field resize-none"
              />
            </div>
          ) : null}
        </div>

        {ordering ? (
        <div className="flex items-center gap-3 border-t border-ink/10 bg-paper px-5 py-4">
          <div className="inline-flex items-center rounded-full border border-ink/15">
            <button
              type="button"
              onClick={() => setQty((value) => Math.max(1, value - 1))}
              className="grid size-11 place-items-center rounded-full text-ink/70 transition hover:text-ink"
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-sm font-bold">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((value) => Math.min(20, value + 1))}
              className="grid size-11 place-items-center rounded-full text-ink/70 transition hover:text-ink"
              aria-label="Increase quantity"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              add({ item, addons: chosen, qty, notes });
              onClose();
            }}
            className="btn btn-gold flex-1"
          >
            Add to order · {money(unitPrice * qty)}
          </button>
        </div>
        ) : null}
      </div>
    </div>
  );
}
