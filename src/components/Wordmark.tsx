import { Link } from "react-router-dom";
import { cn } from "../lib/format";

export function GlassMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-full", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 3h14l-2.2 6.2a4.8 4.8 0 0 1-9.6 0L5 3Z" />
      <path d="M12 14.5V20" />
      <path d="M8 21h8" />
      <path d="M8.2 8h7.6" />
    </svg>
  );
}

export function Wordmark({
  tone = "dark",
  className,
  compact = false,
}: {
  tone?: "dark" | "light";
  className?: string;
  compact?: boolean;
}) {
  const isLight = tone === "light";

  return (
    <Link
      to="/"
      aria-label="Daqs & Oxtails — home"
      className={cn("group flex items-center gap-3", className)}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-xl transition-colors duration-300",
          isLight
            ? "bg-cream px-2.5 py-1.5 shadow-sm group-hover:bg-cream-2"
            : "bg-transparent",
        )}
      >
        <img
          src="/img/logo.png"
          alt=""
          aria-hidden="true"
          width={300}
          height={179}
          className={cn(
            "w-auto",
            isLight ? (compact ? "h-8" : "h-10") : compact ? "h-9" : "h-12",
          )}
        />
      </span>

      {compact ? null : (
        <span
          className={cn(
            "hidden text-[0.5rem] font-semibold uppercase leading-relaxed tracking-[0.3em] xl:block",
            isLight ? "text-cream/70" : "text-muted",
          )}
        >
          Soul food
          <br />
          Plano, TX
        </span>
      )}
    </Link>
  );
}
