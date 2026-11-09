import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Phone, ShoppingBag, X } from "lucide-react";
import { SITE } from "../data/site";
import { getStoreStatus, hoursLabel, HOURS } from "../lib/hours";
import { cn } from "../lib/format";
import { useBodyLock, useEscape, useFocusTrap } from "../lib/useOverlay";
import { useCart } from "../store/cart";
import { useServing } from "../lib/serving";
import { Wordmark } from "./Wordmark";

const NAV = [
  { to: "/menu", label: "Menu" },
  { to: "/catering", label: "Catering" },
  { to: "/about", label: "Our Story" },
  { to: "/visit", label: "Visit" },
];

/**
 * Shown wherever ordering cannot work: the ordering-free cPanel build (where
 * this is decided at build time) and a full build uploaded to a plain-file
 * host (where the /api probe says so). The answer is always the phone.
 */
function PhoneOrderBanner() {
  return (
    <div
      role="region"
      aria-label="Phone ordering"
      className="border-b border-ink/15 bg-gold text-ink print:hidden"
    >
      <div className="shell flex flex-col items-stretch gap-2.5 py-2 text-[0.78rem] font-semibold leading-snug sm:flex-row sm:items-center sm:justify-center sm:gap-3 sm:py-2.5 sm:text-[0.8rem]">
        <span className="flex items-start gap-2 sm:items-center">
          <Phone className="mt-0.5 size-3.5 shrink-0 sm:mt-0" strokeWidth={2.4} />
          Online ordering isn&apos;t available on this site — call the kitchen for
          pickup or delivery.
        </span>
        <a
          href={SITE.phoneHref}
          className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-cream transition hover:bg-royal sm:min-h-9 sm:w-auto sm:px-3.5"
        >
          Call {SITE.phone}
        </a>
      </div>
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count, openCart } = useCart();
  const status = getStoreStatus();
  // A static upload (cPanel) has no ordering API, so no bag and no order CTAs.
  const serving = useServing();
  const ordering = serving !== "static";

  useBodyLock(mobileOpen);
  useEscape(mobileOpen, () => setMobileOpen(false));
  const navRef = useRef<HTMLDivElement>(null);
  useFocusTrap(mobileOpen, navRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {serving === "static" ? <PhoneOrderBanner /> : null}

      <div className="bg-ink text-cream/75 print:hidden">
        <div className="shell flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-[0.7rem] font-medium tracking-wide">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="size-1.5 shrink-0 rounded-full bg-gold" />
            Pickup, delivery &amp; catering
            <span className="text-cream/70">
              · {SITE.deliveryRadius}
            </span>
          </p>
          <a
            href={SITE.phoneHref}
            className="hidden items-center gap-1.5 transition hover:text-gold sm:flex"
          >
            <Phone className="size-3" />
            {SITE.phone}
          </a>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-cream/95 backdrop-blur-md transition-all duration-300 print:hidden",
          scrolled
            ? "border-ink/10 shadow-[0_16px_40px_-32px_rgba(11,20,36,0.8)]"
            : "border-transparent",
        )}
      >
        <div className="shell flex h-[72px] items-center justify-between gap-6">
          <Wordmark compact />

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "relative text-[0.78rem] font-bold uppercase tracking-[0.16em] transition-colors",
                    isActive ? "text-royal" : "text-ink/70 hover:text-ink",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <span
              className={cn(
                "flex items-center gap-1.5 text-[0.7rem] font-semibold",
                status.isOpen ? "text-emerald-700" : "text-muted",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  status.isOpen ? "live-dot bg-emerald-500" : "bg-muted/60",
                )}
              />
              {status.label}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={SITE.phoneHref}
              className="hidden text-[0.78rem] font-bold text-ink/70 transition hover:text-royal xl:block"
            >
              {SITE.phone}
            </a>
            {ordering ? (
              <Link
                to="/menu"
                className="btn btn-gold btn-sm hidden sm:inline-flex"
              >
                Order now
              </Link>
            ) : null}
            {ordering ? (
            <button
              type="button"
              onClick={openCart}
              className="relative grid size-11 place-items-center rounded-full border border-ink/12 text-ink transition hover:border-ink hover:bg-ink hover:text-cream"
              aria-label={`Open your order, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="size-[18px]" strokeWidth={1.8} />
              {count > 0 ? (
                <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-royal px-1 text-[0.62rem] font-bold leading-5 text-cream">
                  {count}
                </span>
              ) : null}
            </button>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-11 place-items-center rounded-full border border-ink/12 text-ink transition hover:border-ink lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <Menu className="size-5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div
          ref={navRef}
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink text-cream outline-none lg:hidden"
        >
          <div className="shell flex h-[72px] items-center justify-between">
            <Wordmark tone="light" compact />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="grid size-11 place-items-center rounded-full border border-cream/20 transition hover:border-gold hover:text-gold"
              aria-label="Close navigation menu"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav
            className="shell flex flex-1 flex-col justify-center gap-2 pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
            aria-label="Mobile"
          >
            {NAV.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="border-b border-cream/10 py-4 font-display text-4xl font-semibold transition hover:text-gold"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/menu"
              onClick={() => setMobileOpen(false)}
              className="btn btn-gold mt-8 w-full"
            >
              {ordering ? "Start an order" : "See the menu"}
            </Link>
            <a
              href={SITE.phoneHref}
              className="mt-3 flex items-center justify-center gap-2 text-sm text-cream/70"
            >
              <Phone className="size-4" /> {SITE.phone}
            </a>
            <p className="mt-8 text-center text-[0.7rem] uppercase tracking-[0.2em] text-cream/65">
              {status.label} · {status.detail}
            </p>
          </nav>
        </div>
      ) : null}
    </>
  );
}

function Footer() {
  const status = getStoreStatus();

  return (
    <footer className="grain relative overflow-hidden bg-ink pt-16 text-cream print:hidden">
      <div className="absolute -left-24 top-10 size-72 rounded-full bg-royal/25 blur-3xl" />
      <div className="absolute -right-16 bottom-0 size-80 rounded-full bg-gold/10 blur-3xl" />
      <div className="shell relative z-10">
        <div className="grid gap-12 border-b border-cream/10 pb-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Wordmark tone="light" />
            <p className="mt-5 text-sm leading-relaxed text-cream/70">
              Slow-braised oxtails, Cajun boils and daiquiris blended to order.
              Bring your appetite — leave with a story.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SITE.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-full border border-cream/20 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition hover:border-gold hover:text-gold"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-gold">
              Order
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-cream/70">
              <li>
                <Link to="/menu" className="transition hover:text-gold">
                  Full menu
                </Link>
              </li>
              <li>
                <Link to="/catering" className="transition hover:text-gold">
                  Catering &amp; trays
                </Link>
              </li>
              <li>
                <Link
                  to="/menu#weekday-lunch"
                  className="transition hover:text-gold"
                >
                  Weekday lunch
                </Link>
              </li>
              <li>
                <Link
                  to="/menu#frozen-daqs"
                  className="transition hover:text-gold"
                >
                  Frozen daqs
                </Link>
              </li>
              <li>
                <a href={SITE.phoneHref} className="transition hover:text-gold">
                  Call-in orders
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-gold">
              Visit
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-cream/70">
              <li>
                <a
                  href={SITE.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-gold"
                >
                  {SITE.addressLine1}
                  <br />
                  {SITE.addressLine2}
                </a>
              </li>
              <li>
                <a href={SITE.phoneHref} className="transition hover:text-gold">
                  {SITE.phone}
                </a>
              </li>
              <li>
                <Link to="/about" className="transition hover:text-gold">
                  Our story
                </Link>
              </li>
              <li>
                <Link to="/visit" className="transition hover:text-gold">
                  Hours &amp; directions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-gold">
              Hours
            </h2>
            <ul className="mt-4 space-y-2 text-[0.82rem] text-cream/70">
              {HOURS.map((day, index) => (
                <li
                  key={day.day}
                  className={cn(
                    "flex items-baseline justify-between gap-3",
                    index === status.todayIndex && "text-cream",
                  )}
                >
                  <span>{day.short}</span>
                  <span
                    className={cn(
                      index === status.todayIndex
                        ? "font-semibold text-gold"
                        : "text-cream/70",
                    )}
                  >
                    {hoursLabel(day)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-7 text-[0.78rem] text-cream/65 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p>© {new Date().getFullYear()} Daqs &amp; Oxtails · Plano, Texas</p>
            <span aria-hidden="true" className="text-cream/20">
              |
            </span>
            <a
              href="https://smartsytes.com"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 transition hover:text-gold"
            >
              Proudly Powered By
              <span className="font-bold uppercase tracking-[0.16em] text-cream/70 transition group-hover:text-gold">
                SMARTSYTES
              </span>
            </a>
          </div>
          <p className="max-w-xl leading-relaxed">{SITE.policy}</p>
          <p>Must be 21+ for daiquiris · Please drink responsibly</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { count } = useCart();

  return (
    <div
      className={cn(
        "flex min-h-svh flex-col",
        count > 0 && "pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:pb-0",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-ink"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
