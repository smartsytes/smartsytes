import { ShoppingBag } from "lucide-react";
import { money } from "../lib/format";
import { useCart } from "../store/cart";
import { useOrderingAvailable } from "../lib/serving";

export function MobileCartBar() {
  const { count, subtotal, openCart } = useCart();
  const ordering = useOrderingAvailable();
  if (!ordering || count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-cream/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:hidden">
      <button
        type="button"
        onClick={openCart}
        className="btn btn-ink w-full justify-between pl-5 pr-4"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="size-4" />
          {count} item{count === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-2">
          {money(subtotal)}
          <span className="text-gold">View order</span>
        </span>
      </button>
    </div>
  );
}
