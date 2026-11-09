import type { MenuItem } from "../data/menu";
import { cn } from "../lib/format";
import { GlassMark } from "./Wordmark";

export function MenuThumb({
  item,
  className,
  imageClassName,
}: {
  item: MenuItem;
  className?: string;
  imageClassName?: string;
}) {
  if (item.image) {
    return (
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        className={cn("h-full w-full object-cover", imageClassName, className)}
      />
    );
  }

  if (item.swatch) {
    return (
      <div
        className={cn("relative h-full w-full overflow-hidden", className)}
        style={{
          background: `radial-gradient(120% 110% at 28% 18%, ${item.swatch[0]}, ${item.swatch[1]})`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="size-14 text-white/70 drop-shadow">
            <GlassMark />
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
    );
  }

  const initials = item.name
    .split(" ")
    .filter((word) => /[a-z]/i.test(word[0] ?? ""))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  return (
    <div
      className={cn(
        "relative grid h-full w-full place-items-center overflow-hidden bg-ink",
        className,
      )}
    >
      <div className="absolute inset-0 opacity-[0.16] [background-image:repeating-linear-gradient(45deg,#e8b34b_0,#e8b34b_1px,transparent_1px,transparent_14px)]" />
      <div className="absolute -right-10 -top-10 size-40 rounded-full border border-gold/20" />
      <div className="absolute -bottom-12 -left-8 size-36 rounded-full border border-gold/15" />
      <span className="relative font-display text-5xl font-semibold text-gold/90">
        {initials}
      </span>
      <span className="absolute bottom-4 left-4 right-4 truncate text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-cream/70">
        Daqs &amp; Oxtails
      </span>
    </div>
  );
}
