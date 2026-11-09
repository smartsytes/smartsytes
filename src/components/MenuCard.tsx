import { Plus } from "lucide-react";
import type { MenuItem } from "../data/menu";
import { cn, money } from "../lib/format";
import { useCart } from "../store/cart";
import { useOrderingAvailable } from "../lib/serving";
import { MenuThumb } from "./MenuThumb";

export function MenuCard({
  item,
  onSelect,
  className,
}: {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  className?: string;
}) {
  const { add } = useCart();
  const ordering = useOrderingAvailable();

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-[1.35rem] border border-ink/8 bg-paper transition duration-300 hover:-translate-y-1 hover:border-ink/15 hover:shadow-[0_24px_50px_-30px_rgba(11,20,36,0.5)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="relative block aspect-[4/3] w-full overflow-hidden text-left"
        aria-label={`View ${item.name}`}
      >
        <div className="h-full w-full transition duration-500 group-hover:scale-[1.04]">
          <MenuThumb item={item} />
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[0.8rem] font-bold text-ink shadow-sm backdrop-blur">
          {money(item.price)}
        </span>
        {item.tags?.[0] ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-cream backdrop-blur">
            {item.tags[0]}
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="text-left font-display text-lg font-semibold leading-tight text-ink transition group-hover:text-royal"
          >
            {item.name}
          </button>
          {ordering ? (
            <button
              type="button"
              onClick={() => add({ item })}
              aria-label={`Add ${item.name} to your order`}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-ink transition hover:scale-105 hover:bg-ink hover:text-gold"
            >
              <Plus className="size-4" strokeWidth={2.6} />
            </button>
          ) : null}
        </div>
        <p className="line-clamp-2 text-[0.83rem] leading-relaxed text-muted">
          {item.description}
        </p>
        {item.spicy ? (
          <span className="mt-auto pt-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-clay">
            Cajun spice
          </span>
        ) : null}
      </div>
    </article>
  );
}
