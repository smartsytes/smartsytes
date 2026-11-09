import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  IdCard,
  MapPin,
  Phone,
  ShoppingBag,
  Users,
} from "lucide-react";
import { SITE } from "../data/site";
import { getStoreStatus, hoursLabel, HOURS } from "../lib/hours";
import { cn } from "../lib/format";
import { Reveal } from "../components/Reveal";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const faqs = [
  {
    q: "Do you offer delivery and takeout?",
    a: `Yes. Order online for pickup, or have it delivered across ${SITE.deliveryRadius}. Call-in orders are welcome too — ${SITE.phone}.`,
  },
  {
    q: "How do call-in orders work?",
    a: SITE.policy,
  },
  {
    q: "Can you feed a crowd?",
    a: "Party trays of oxtails, wings, greens and seafood boil — plus gallon daqs. Call the kitchen and we'll build the order with you, with a little notice for the bigger trays.",
  },
  {
    q: "What's the story with the daiquiris?",
    a: "They're blended to order, so they're at their best when you drink them soon after pickup. Daiquiris are 21+ only with a valid ID — no exceptions.",
  },
  {
    q: "Are you open on Mondays?",
    a: "We're closed Mondays. Tuesday through Thursday we're open 12–9, Friday and Saturday 12–10, and Sunday 12–8.",
  },
  {
    q: "Where exactly are you in the plaza?",
    a: `Suite 127 at ${SITE.addressLine1.replace(", Suite 127", "")}, ${SITE.addressLine2}. If you can't spot the door, call us and we'll wave you in.`,
  },
];

const notes = [
  {
    icon: MapPin,
    title: "Find the door",
    copy: `We're in Suite 127 at 8700 Preston Road. Pull into the plaza and look for the Daqs & Oxtails sign — if you're circling, call ${SITE.phone}.`,
  },
  {
    icon: Users,
    title: "Groups & trays",
    copy: "Coming with a table of eight, or ordering for the office? Call ahead so the kitchen can have the oxtails and trays ready when you walk in.",
  },
  {
    icon: IdCard,
    title: "Bring your ID",
    copy: "Daiquiris are 21+ with a valid photo ID, every time. Food and non-alcoholic drinks are open to everyone.",
  },
];

export function Visit() {
  useDocumentTitle(
    "Visit — Daqs & Oxtails, 8700 Preston Rd, Plano TX",
    "Hours, address and directions for Daqs & Oxtails at 8700 Preston Road, Suite 127, Plano, Texas. Open Tuesday to Sunday for dine-in, pickup and delivery.",
  );

  const status = getStoreStatus();

  return (
    <>
      <section className="grain relative overflow-hidden bg-ink pb-14 pt-12 text-cream sm:pb-20 sm:pt-16">
        <div className="pointer-events-none absolute -right-24 top-0 size-[28rem] rounded-full bg-royal/35 blur-[110px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 size-[22rem] rounded-full bg-gold/10 blur-[100px]" />

        <div className="shell relative z-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <span className="eyebrow flex items-center gap-2 text-gold">
              <span className="h-px w-6 bg-gold/60" /> Visit us
            </span>
            <h1 className="mt-4 font-display text-[clamp(2.7rem,6.6vw,4.9rem)] font-semibold leading-[0.94] tracking-[-0.035em]">
              Come
              <br />
              <span className="italic text-gold">through.</span>
            </h1>
            <p className="mt-6 max-w-md text-[0.98rem] leading-relaxed text-cream/70">
              Plano, Texas — Preston Road, Suite 127. Walk in for dinner, grab
              it to go, or let us bring it to your door.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3.5 py-1.5 text-[0.68rem] font-semibold">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    status.isOpen ? "live-dot bg-emerald-400" : "bg-cream/40",
                  )}
                />
                {status.label}
                <span className="text-cream/65">·</span>
                <span className="font-medium normal-case tracking-normal text-cream/70">
                  {status.detail}
                </span>
              </span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={SITE.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-gold"
              >
                Get directions <ArrowUpRight className="size-4" />
              </a>
              <a href={SITE.phoneHref} className="btn btn-outline-light">
                <Phone className="size-4" /> {SITE.phone}
              </a>
              <Link to="/menu" className="btn btn-outline-light">
                <ShoppingBag className="size-4" /> Order pickup
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-cream/12 bg-cream/[0.04] p-5 backdrop-blur-sm sm:p-6">
            <p className="flex items-center justify-between border-b border-cream/10 pb-3 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cream/70">
              <span className="flex items-center gap-2">
                <CalendarClock className="size-3.5 text-gold" /> This week
              </span>
              <span className="text-gold">Open daily except Mon</span>
            </p>
            <ul className="divide-y divide-cream/10">
              {HOURS.map((day, index) => {
                const isToday = index === status.todayIndex;
                return (
                  <li
                    key={day.day}
                    className="flex items-baseline justify-between gap-4 py-2.5 text-[0.86rem]"
                  >
                    <span
                      className={cn(
                        isToday ? "font-bold text-cream" : "text-cream/70",
                      )}
                    >
                      {day.day}
                      {isToday ? (
                        <span className="ml-2 rounded-full bg-gold/25 px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-[0.14em] text-gold">
                          Today
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        isToday
                          ? "font-semibold text-gold"
                          : "text-cream/70",
                      )}
                    >
                      {hoursLabel(day)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <a
              href={SITE.phoneHref}
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gold py-3 text-[0.82rem] font-bold text-ink transition hover:bg-gold-2"
            >
              <Phone className="size-4" /> Call the kitchen
            </a>
          </div>
        </div>
      </section>

      <section className="shell py-14 sm:py-20">
        <div className="grid items-stretch gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="flex h-full flex-col rounded-[1.5rem] border border-ink/10 bg-paper p-7 sm:p-9">
              <span className="eyebrow flex items-center gap-2 text-royal">
                <span className="h-px w-6 bg-gold" /> The address
              </span>
              <h2 className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.04] tracking-[-0.02em]">
                8700 Preston Road
                <br />
                <span className="italic text-royal">Suite 127.</span>
              </h2>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
                Plano, TX 75024 — the 8700 block of Preston, in the plaza.
                Dine-in, pickup and delivery run out of the same kitchen, so
                everything you order leaves hot.
              </p>

              <dl className="mt-6 space-y-4 border-t border-ink/8 pt-5 text-[0.88rem]">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-royal" />
                  <div>
                    <dt className="font-semibold">Address</dt>
                    <dd className="text-muted">
                      {SITE.addressLine1}, {SITE.addressLine2}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-royal" />
                  <div>
                    <dt className="font-semibold">Phone</dt>
                    <dd className="text-muted">
                      <a
                        href={SITE.phoneHref}
                        className="transition hover:text-royal"
                      >
                        {SITE.phone}
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShoppingBag className="mt-0.5 size-4 shrink-0 text-royal" />
                  <div>
                    <dt className="font-semibold">Pickup &amp; delivery</dt>
                    <dd className="text-muted">{SITE.deliveryRadius}</dd>
                  </div>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap gap-3 pt-7">
                <a
                  href={SITE.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ink"
                >
                  Open in Maps <ArrowUpRight className="size-4" />
                </a>
                <Link to="/menu" className="btn btn-outline">
                  Start an order <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="relative h-full min-h-[380px] overflow-hidden rounded-[1.5rem] border border-ink/10 bg-cream-2">
              <iframe
                title="Map to Daqs & Oxtails, 8700 Preston Rd Suite 127, Plano, Texas"
                src={SITE.mapEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[380px] w-full grayscale-[25%]"
              />
              <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-cream/95 px-4 py-2 text-[0.72rem] font-bold shadow-lg">
                Daqs &amp; Oxtails · Suite 127
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {notes.map((note, index) => {
            const Icon = note.icon;
            return (
              <Reveal key={note.title} delay={index * 80}>
                <div className="flex h-full gap-3 rounded-[1.35rem] border border-ink/10 bg-paper p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream-2 text-royal">
                    <Icon className="size-4.5" strokeWidth={1.7} />
                  </span>
                  <div>
                    <h3 className="font-display text-[1.05rem] font-semibold">
                      {note.title}
                    </h3>
                    <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
                      {note.copy}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="border-y border-ink/8 bg-cream-2/50 py-14 sm:py-20">
        <div className="shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="eyebrow flex items-center gap-2 text-royal">
              <span className="h-px w-6 bg-gold" /> Good to know
            </span>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.8vw,2.8rem)] font-semibold leading-[1.03] tracking-[-0.02em]">
              Questions,{" "}
              <span className="italic text-royal">answered.</span>
            </h2>
            <p className="mt-3 max-w-sm text-[0.9rem] leading-relaxed text-muted">
              Can&apos;t find what you need? The kitchen picks up the phone —
              call {SITE.phone}.
            </p>
          </div>

          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.95rem] font-semibold">
                  {faq.q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-ink/15 text-royal transition group-open:rotate-45 group-open:border-royal group-open:bg-royal group-open:text-cream">
                    <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
                      <path
                        d="M6 1v10M1 6h10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-2.5 max-w-xl pr-10 text-[0.88rem] leading-relaxed text-muted">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="grain relative overflow-hidden bg-royal py-16 text-cream sm:py-20">
        <div className="pointer-events-none absolute -right-16 -top-20 size-80 rounded-full border border-cream/10" />
        <div className="shell relative z-10 flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
              The oxtails are ready.{" "}
              <span className="italic text-gold">Are you?</span>
            </h2>
            <p className="mt-3 max-w-md text-[0.9rem] leading-relaxed text-cream/70">
              Order ahead for pickup, or call and we&apos;ll talk you through the
              menu.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/menu" className="btn btn-gold">
              Order online <ArrowRight className="size-4" />
            </Link>
            <a href={SITE.phoneHref} className="btn btn-outline-light">
              <Phone className="size-4" /> {SITE.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
