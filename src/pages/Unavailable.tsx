import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function Unavailable({ title, detail }: { title: string; detail: string }) {
  useDocumentTitle(`${title} — Daqs & Oxtails`);

  return (
    <section className="shell py-24">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-[clamp(1.9rem,4.4vw,2.6rem)] font-semibold leading-tight">
          {title}
        </h1>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">{detail}</p>
        <Link to="/" className="btn btn-ink mt-6">
          Back home <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
