import { Check } from "lucide-react";
import { useCart } from "../store/cart";

export function Toast() {
  const { toast } = useCart();
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 px-4 sm:bottom-8"
    >
      <div
        key={toast.id}
        className="fade-up flex items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-cream shadow-xl"
      >
        <span className="grid size-5 place-items-center rounded-full bg-gold text-ink">
          <Check className="size-3" strokeWidth={3} />
        </span>
        {toast.message}
      </div>
    </div>
  );
}
