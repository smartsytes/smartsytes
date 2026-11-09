import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone, Search, X } from "lucide-react";
import { categories, menu, type MenuItem } from "../data/menu";
import { SITE } from "../data/site";
import { getStoreStatus } from "../lib/hours";
import { useOrderingAvailable } from "../lib/serving";
import { cn } from "../lib/format";
import { MenuCard } from "../components/MenuCard";
import { ItemSheet } from "../components/ItemSheet";

const anchorFor = (categoryId: string) =>
  categoryId === "specials"
    ? "weekday-lunch"
    : categoryId === "daqs"
      ? "frozen-daqs"
      : categoryId;

export function MenuPage() {
  const [active, setActive] = useState<MenuItem | null>(null);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const status = getStoreStatus();
  const ordering = useOrderingAvailable();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return menu.filter((item) => {
      const inCategory = category === "all" || item.category === category;
      const inSearch =
        !needle ||
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle);
      return inCategory && inSearch;
    });
  }, [category, query]);

  const sections = categories
    .map((entry) => ({
      ...entry,
      items: visible.filter((item) => item.category === entry.id),
    }))
    .filter((entry) => entry.items.length > 0);

  return (
    <>
      <section className="grain relative overflow-hidden bg-ink pb-10 pt-12 text-cream sm:pb-14 sm:pt-16">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-royal/35 blur-[110px]" />
        <div className="shell relative z-10">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <span className="eyebrow flex items-center gap-2 text-gold">
                <span className="h-px w-6 bg-gold/60" />{" "}
                {ordering ? "Order online" : "Full menu"}
              </span>
              <h1 className="mt-3 font-display text-[clamp(2.6rem,6.4vw,4.8rem)] font-semibold leading-[0.94] tracking-[-0.035em]">
                The menu.
              </h1>
              <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-cream/65">
                Everything is cooked to order. Pick your plates, add a daq, and
                we&apos;ll have it ready — pickup on Preston Road or delivery
                across Plano.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3.5 py-1.5 text-[0.68rem] font-semibold">
                <span
                  className={
                    status.isOpen
                      ? "live-dot size-1.5 rounded-full bg-emerald-400"
                      : "size-1.5 rounded-full bg-cream/40"
                  }
                />
                {status.label} · {status.detail}
              </span>
              <a
                href={SITE.phoneHref}
                className="text-[0.78rem] font-semibold text-cream/70 transition hover:text-gold"
              >
                Prefer to call? {SITE.phone}
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-cream/65" />
              <label htmlFor="menu-search" className="sr-only">
                Search the menu
              </label>
              <input
                id="menu-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search oxtails, gumbo, daqs…"
                className="w-full rounded-full border border-cream/15 bg-cream/[0.06] py-3 pl-11 pr-11 text-base text-cream placeholder:text-cream/65 focus:border-gold"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-cream/10 text-cream/70 transition hover:bg-cream/20"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-cream/65">
              {visible.length} item{visible.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </section>

      <div className="sticky top-[72px] z-30 border-y border-ink/10 bg-cream/95 backdrop-blur-md">
        <div className="shell">
          <div className="no-bar flex gap-2 overflow-x-auto py-3">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-4 py-2.5 text-[0.75rem] font-bold uppercase tracking-[0.1em] transition",
                category === "all"
                  ? "bg-ink text-cream"
                  : "border border-ink/15 text-ink/70 hover:border-ink/40 hover:text-ink",
              )}
            >
              Everything
            </button>
            {categories.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setCategory(entry.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-full px-4 py-2.5 text-[0.75rem] font-bold uppercase tracking-[0.1em] transition",
                  category === entry.id
                    ? "bg-ink text-cream"
                    : "border border-ink/15 text-ink/70 hover:border-ink/40 hover:text-ink",
                )}
              >
                {entry.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="shell py-12 sm:py-16">
        {sections.length === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <h2 className="font-display text-2xl font-semibold">
              Nothing matched “{query}”
            </h2>
            <p className="mt-2 text-sm text-muted">
              Try “oxtail”, “gumbo”, “catfish” — or browse everything on the
              menu.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="btn btn-ink btn-sm mt-5"
            >
              Reset menu
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {sections.map((section) => (
              <div key={section.id} id={anchorFor(section.id)} className="scroll-mt-40">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-4">
                  <div>
                    <h2 className="font-display text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold leading-tight">
                      {section.name}
                    </h2>
                    <p className="mt-1 text-[0.85rem] text-muted">
                      {section.blurb}
                    </p>
                  </div>
                  {section.note ? (
                    <p className="rounded-full bg-cream-2 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink/60">
                      {section.note}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.items.map((item) => (
                    <MenuCard key={item.id} item={item} onSelect={setActive} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 flex flex-col items-center gap-4 rounded-[1.5rem] border border-ink/10 bg-paper p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              Need it for a crowd?
            </h2>
            <p className="mt-1 max-w-lg text-[0.85rem] text-muted">
              We cater offices, parties and family reunions — oxtails by the
              tray, boils by the pound. Give the kitchen a call and we&apos;ll
              build it with you.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            <a href={SITE.phoneHref} className="btn btn-ink">
              <Phone className="size-4" /> {SITE.phone}
            </a>
            <Link to="/catering" className="btn btn-outline">
              Catering trays <ArrowRight className="size-4" />
            </Link>
            <Link to="/visit" className="btn btn-outline">
              Hours <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-[0.72rem] leading-relaxed text-muted">
          {SITE.policy} Menu items and prices may change — call to confirm
          specials.
        </p>
      </section>

      <ItemSheet item={active} onClose={() => setActive(null)} />
    </>
  );
}
