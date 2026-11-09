import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function NotFound() {
  useDocumentTitle("Page not found — Daqs & Oxtails");

  return (
    <section className="grain relative overflow-hidden bg-ink py-24 text-cream sm:py-32">
      <div className="pointer-events-none absolute -right-24 top-0 size-[26rem] rounded-full bg-royal/35 blur-[110px]" />
      <div className="shell relative z-10 max-w-xl">
        <span className="eyebrow flex items-center gap-2 text-gold">
          <span className="h-px w-6 bg-gold/60" /> 404
        </span>
        <h1 className="mt-3 font-display text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
          That plate isn&apos;t on the menu.
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-cream/65">
          The page you were looking for has moved or never existed. The good
          stuff — oxtails, gumbo and daqs — is still right this way.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/menu" className="btn btn-gold">
            See the menu <ArrowRight className="size-4" />
          </Link>
          <Link to="/" className="btn btn-outline-light">
            Back home
          </Link>
        </div>
      </div>
    </section>
  );
}
