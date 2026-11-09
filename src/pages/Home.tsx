import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  PartyPopper,
  Phone,
  Plus,
  ShoppingBag,
  Star,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { menu, popularItems, type MenuItem } from "../data/menu";
import { SITE } from "../data/site";
import { getStoreStatus, hoursLabel, HOURS } from "../lib/hours";
import { money } from "../lib/format";
import { useCart } from "../store/cart";
import { useServing } from "../lib/serving";
import { MenuCard } from "../components/MenuCard";
import { MenuThumb } from "../components/MenuThumb";
import { ItemSheet } from "../components/ItemSheet";
import { Reveal } from "../components/Reveal";
import { GlassMark } from "../components/Wordmark";

const featured = popularItems.slice(0, 4);
const daqs = menu.filter((item) => item.category === "daqs");
const lunchItems = menu.filter((item) => item.category === "specials").slice(0, 3);

const reviews = [
  {
    name: "Byron Ricks",
    initials: "BR",
    quote:
      "The portions are generous and the food is full of authentic, rich flavor. The oxtails reminded me of home cooking at its finest, and the daiquiris are the perfect balance of sweet and strong.",
  },
  {
    name: "Shenque James",
    initials: "SJ",
    quote:
      "The oxtails were so tender they practically melted in my mouth, and the seasoning was perfection. Pairing that with a signature daiquiri was a game-changer. Warm staff, vibrant room.",
  },
];

const marqueeWords = [
  "Oxtails",
  "Frozen Daqs",
  "Cajun Boil",
  "Gumbo",
  "Catfish",
  "Soul Food",
  "Weekday Lunch",
];

type OrderOption = {
  icon: typeof ShoppingBag;
  title: string;
  copy: string;
  cta: { label: string; to?: string; href?: string };
};

const orderOptions: OrderOption[] = [
  {
    icon: ShoppingBag,
    title: "Pickup",
    copy: "Order ahead, walk in, walk out hot. We fire it when you arrive.",
    cta: { label: "Order pickup", to: "/menu" },
  },
  {
    icon: Truck,
    title: "Delivery",
    copy: `Straight to your door across ${SITE.deliveryRadius}.`,
    cta: { label: "Order delivery", to: "/menu" },
  },
  {
    icon: PartyPopper,
    title: "Catering",
    copy: "Trays, boils and daqs for offices, parties and family reunions.",
    cta: { label: "Plan a cater", to: "/catering" },
  },
];

export function Home() {
  const [active, setActive] = useState<MenuItem | null>(null);
  const status = getStoreStatus();
  const { add } = useCart();
  const pasta = menu.find((item) => item.id === "oxtail-pasta") ?? menu[0];
  const ordering = useServing() !== "static";

  // A static host can't take an online order, so pickup/delivery point at the
  // phone instead of a checkout that would fail.
  const orderChoices: OrderOption[] = ordering
    ? orderOptions
    : orderOptions.map((option) =>
        option.cta.label.startsWith("Order")
          ? { ...option, cta: { label: "Call to order", href: SITE.phoneHref } }
          : option,
      );

  return (
    <>
      {/* Hero */}
      <section className="grain relative overflow-hidden bg-ink text-cream">
        <div className="pointer-events-none absolute -left-40 top-0 size-[34rem] rounded-full bg-royal/30 blur-[110px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-[28rem] rounded-full bg-gold/10 blur-[100px]" />

        <div className="shell relative z-10 grid gap-14 pb-16 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-16">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3.5 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-cream/80">
                <span
                  className={
                    status.isOpen
                      ? "live-dot size-1.5 rounded-full bg-emerald-400"
                      : "size-1.5 rounded-full bg-cream/40"
                  }
                />
                {status.label}
                <span className="text-cream/65">·</span>
                <span className="font-medium normal-case tracking-normal text-cream/70">
                  {status.detail}
                </span>
              </span>
              <span className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-gold">
                Plano, Texas
              </span>
            </div>

            <h1 className="mt-6 font-display text-[clamp(2.9rem,7.4vw,5.4rem)] font-semibold leading-[0.9] tracking-[-0.035em]">
              The vibe.
              <br />
              The flavor.
              <br />
              <span className="italic text-gold">The oxtails.</span>
            </h1>

            <p className="mt-7 max-w-md text-[0.98rem] leading-relaxed text-cream/70">
              Fall-off-the-bone oxtails, Cajun boils and daiquiris blended to
              order. Cooked slow, seasoned right, served from our kitchen on
              Preston Road.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/menu" className="btn btn-gold">
                {ordering ? "Start an order" : "See the menu"}{" "}
                <ArrowRight className="size-4" />
              </Link>
              <a href={SITE.phoneHref} className="btn btn-outline-light">
                <Phone className="size-4" /> {SITE.phone}
              </a>
            </div>

            <dl className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-cream/10 pt-7">
              <div>
                <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-cream/65">
                  Google rating
                </dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="font-display text-2xl font-semibold">5.0</span>
                  <span className="flex gap-0.5 text-gold">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="size-3 fill-current" />
                    ))}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-cream/65">
                  On the menu
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold">
                  20+ dishes
                </dd>
              </div>
              <div>
                <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-cream/65">
                  Feeding Plano
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold">
                  5+ years
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[440px] lg:mr-4">
            <div className="pointer-events-none absolute -inset-3 rounded-t-[18rem] rounded-b-[2rem] border border-gold/20" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[17rem] rounded-b-[1.75rem] border border-cream/10 bg-ink-2">
              <img
                src="/img/hero.jpg"
                alt="Oxtails, fried catfish, wings and frozen daiquiris from Daqs & Oxtails"
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              <div className="absolute inset-x-5 bottom-5">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.24em] text-gold">
                  The table
                </p>
                <p className="mt-1 font-display text-lg text-cream">
                  Oxtails · Catfish · Wings · Daqs
                </p>
              </div>
            </div>

            <div className="absolute -right-2 top-10 grid size-24 rotate-6 place-items-center rounded-full bg-gold text-center text-ink shadow-2xl sm:-right-6 sm:size-28">
              <span className="text-[0.55rem] font-extrabold uppercase leading-[1.35] tracking-[0.16em]">
                Made
                <br />
                from
                <br />
                scratch
              </span>
            </div>

            <div className="absolute -bottom-5 -left-2 w-[235px] rounded-2xl border border-ink/10 bg-cream p-3 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:-left-10">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg">
                  <MenuThumb item={pasta} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[0.8rem] font-bold">{pasta.name}</p>
                  <p className="text-[0.7rem] text-muted">
                    {money(pasta.price)} · most ordered
                  </p>
                </div>
                {ordering ? (
                  <button
                    type="button"
                    onClick={() => add({ item: pasta })}
                    className="ml-auto grid size-8 shrink-0 place-items-center rounded-full bg-ink text-cream transition hover:bg-royal"
                    aria-label={`Add ${pasta.name} to your order`}
                  >
                    <Plus className="size-4" strokeWidth={2.6} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee overflow-hidden border-y border-ink/10 bg-gold py-3 text-ink">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 items-center"
              aria-hidden={copy === 1}
            >
              {marqueeWords.map((word) => (
                <span key={`${copy}-${word}`} className="flex items-center">
                  <span className="px-6 font-display text-sm font-semibold uppercase tracking-[0.22em]">
                    {word}
                  </span>
                  <span className="text-ink/40">✳</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Order options */}
      <section className="shell py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {orderChoices.map((option, index) => {
            const Icon = option.icon;
            return (
              <Reveal key={option.title} delay={index * 90}>
                <div className="group flex h-full flex-col gap-3 rounded-[1.35rem] border border-ink/10 bg-paper p-6 transition hover:-translate-y-1 hover:border-ink/20">
                  <span className="grid size-11 place-items-center rounded-full bg-cream-2 text-royal transition group-hover:bg-gold group-hover:text-ink">
                    <Icon className="size-5" strokeWidth={1.7} />
                  </span>
                  <h2 className="font-display text-xl font-semibold">
                    {option.title}
                  </h2>
                  <p className="text-[0.85rem] leading-relaxed text-muted">
                    {option.copy}
                  </p>
                  {option.cta.to ? (
                    <Link
                      to={option.cta.to}
                      className="link-underline mt-auto pt-2 text-royal"
                    >
                      {option.cta.label} <ArrowRight className="size-3.5" />
                    </Link>
                  ) : (
                    <a
                      href={option.cta.href}
                      className="link-underline mt-auto pt-2 text-royal"
                    >
                      {option.cta.label} <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Featured menu */}
      <section className="border-t border-ink/8 bg-cream-2/60 py-16 sm:py-24">
        <div className="shell">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow flex items-center gap-2 text-royal">
                  <span className="h-px w-6 bg-gold" /> Most ordered
                </span>
                <h2 className="mt-3 max-w-lg font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
                  The plates people come back for.
                </h2>
              </div>
              <Link to="/menu" className="link-underline text-ink">
                Full menu <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item, index) => (
              <Reveal key={item.id} delay={index * 70}>
                <MenuCard item={item} onSelect={setActive} className="h-full" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="overflow-hidden py-20 sm:py-28">
        <div className="shell grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal className="relative">
            <div className="relative w-[86%] overflow-hidden rounded-[1.5rem] border border-ink/10">
              <img
                src="/img/interior.jpg"
                alt="Inside Daqs & Oxtails in Plano, Texas"
                className="aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-8 right-0 w-[46%] overflow-hidden rounded-[1.2rem] border-4 border-cream shadow-xl">
              <img
                src="/img/menu-plate.jpg"
                alt="A Cajun boil tray with shrimp, corn, sausage and potato"
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -left-1 bottom-6 flex max-w-[260px] items-center gap-3 rounded-2xl border border-ink/10 bg-paper p-3 shadow-lg">
              <img
                src="/img/founder.jpg"
                alt="Renee Hudson, CEO of Daqs & Oxtails"
                className="size-11 rounded-full object-cover"
                loading="lazy"
              />
              <div>
                <p className="font-display text-[0.9rem] font-semibold">
                  Renee Hudson
                </p>
                <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                  CEO &amp; founder
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <span className="eyebrow flex items-center gap-2 text-royal">
              <span className="h-px w-6 bg-gold" /> Our story
            </span>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.03] tracking-[-0.02em]">
              Seasoned by tradition.
              <br />
              <span className="italic text-royal">Served with soul.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-muted">
              Daqs &amp; Oxtails started with one idea: the food you grew up on
              deserves to be treated like fine dining. Oxtails braised until
              they give way to a fork. Gumbo built from a real roux. Cornbread
              out of the oven, not a box.
            </p>
            <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted">
              Every plate leaves our Preston Road kitchen the way we would serve
              it at our own table — and every daiquiri is blended the moment
              you order it.
            </p>

            <figure className="mt-7 border-l-2 border-gold pl-4">
              <blockquote className="font-display text-lg italic leading-snug text-ink/85">
                “Authenticity and taste converge here, so every meal is a
                journey of pure culinary delight.”
              </blockquote>
              <figcaption className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">
                Renee Hudson · CEO
              </figcaption>
            </figure>

            <ul className="mt-8 grid max-w-md grid-cols-2 gap-3">
              {["Authenticity", "Taste", "Tradition", "Excellence"].map(
                (value) => (
                  <li
                    key={value}
                    className="flex items-center gap-2 text-[0.8rem] font-semibold text-ink/75"
                  >
                    <span className="size-1.5 rounded-full bg-gold" />
                    {value}
                  </li>
                ),
              )}
            </ul>

            <Link to="/about" className="btn btn-ink mt-8">
              Read our story <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Daq bar */}
      <section className="grain relative overflow-hidden bg-ink py-20 text-cream sm:py-24">
        <div className="pointer-events-none absolute -right-20 top-0 size-[26rem] rounded-full bg-royal/40 blur-[110px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 size-[22rem] rounded-full bg-gold/10 blur-[100px]" />
        <div className="shell relative z-10">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow flex items-center gap-2 text-gold">
                  <span className="h-px w-6 bg-gold/60" /> The Daq Bar
                </span>
                <h2 className="mt-3 max-w-xl font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
                  Frozen. Blended to order.{" "}
                  <span className="italic text-gold">Yours.</span>
                </h2>
              </div>
              <p className="max-w-xs text-[0.82rem] leading-relaxed text-cream/70">
                Twelve ounces of cold, made when you order — not sitting in a
                machine all day. 21+ with valid ID.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {daqs.map((daq, index) => (
              <Reveal key={daq.id} delay={index * 70}>
                <button
                  type="button"
                  onClick={() => setActive(daq)}
                  className="group block w-full overflow-hidden rounded-[1.35rem] border border-cream/12 bg-cream/[0.04] text-left transition hover:-translate-y-1 hover:border-gold/40"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <MenuThumb item={daq} imageClassName="transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold leading-tight">
                        {daq.name}
                      </h3>
                      <p className="mt-0.5 text-[0.7rem] uppercase tracking-[0.14em] text-cream/65">
                        12 oz · 21+
                      </p>
                    </div>
                    <span className="rounded-full bg-gold px-2.5 py-1 text-[0.75rem] font-bold text-ink">
                      {money(daq.price)}
                    </span>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>

          <p className="mt-6 text-[0.68rem] uppercase tracking-[0.16em] text-cream/65">
            Must be 21+ with valid ID · Please drink responsibly
          </p>
        </div>
      </section>

      {/* Weekday lunch */}
      <section className="bg-cream py-16 sm:py-24">
        <div className="shell">
          <Reveal>
            <div className="grain relative overflow-hidden rounded-[1.75rem] bg-royal p-7 text-cream sm:p-10 lg:p-12">
              <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full border border-cream/10" />
              <div className="pointer-events-none absolute -bottom-24 right-24 size-64 rounded-full border border-cream/10" />
              <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
                <div>
                  <span className="eyebrow flex items-center gap-2 text-gold">
                    <span className="h-px w-6 bg-gold/60" /> Weekday lunch
                  </span>
                  <h2 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
                    $15 and under.
                    <br />
                    <span className="italic text-gold">Monday to Friday.</span>
                  </h2>
                  <p className="mt-4 max-w-md text-[0.9rem] leading-relaxed text-cream/70">
                    Lunch pasta, wings, catfish, shrimp and the veggie plate —
                    12 PM to 4 PM, while it lasts. Dine in or take it back to the
                    desk.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link to="/menu" className="btn btn-gold">
                      See lunch menu <ArrowRight className="size-4" />
                    </Link>
                    <a href={SITE.phoneHref} className="btn btn-outline-light">
                      Call to order
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl border border-cream/15 bg-ink/25 p-4 backdrop-blur-sm">
                  <p className="flex items-center justify-between border-b border-cream/10 pb-3 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-cream/70">
                    <span>Today&apos;s picks</span>
                    <span className="text-gold">12–4 PM</span>
                  </p>
                  <ul className="divide-y divide-cream/10">
                    {lunchItems.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        <div className="size-11 shrink-0 overflow-hidden rounded-lg">
                          <MenuThumb item={item} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.83rem] font-semibold">
                            {item.name}
                          </p>
                          <p className="line-clamp-1 text-[0.7rem] text-cream/70">
                            {item.description}
                          </p>
                        </div>
                        <span className="text-[0.83rem] font-bold text-gold">
                          {money(item.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="border-y border-ink/8 bg-cream-2/60 py-20 sm:py-24">
        <div className="shell">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow flex items-center gap-2 text-royal">
                  <span className="h-px w-6 bg-gold" /> Loved by many
                </span>
                <h2 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
                  Good food. Good vibes.{" "}
                  <span className="italic text-royal">Good people.</span>
                </h2>
              </div>
              <a
                href={SITE.reviewsUrl}
                target="_blank"
                rel="noreferrer"
                className="link-underline text-ink"
              >
                Read all reviews <ArrowUpRight className="size-4" />
              </a>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {reviews.map((review, index) => (
              <Reveal key={review.name} delay={index * 80}>
                <figure className="flex h-full flex-col gap-4 rounded-[1.35rem] border border-ink/10 bg-paper p-6">
                  <div className="flex gap-0.5 text-gold">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-[0.9rem] leading-relaxed text-ink/80">
                    “{review.quote}”
                  </blockquote>
                  <figcaption className="mt-auto flex items-center gap-3 pt-2">
                    <span className="grid size-9 place-items-center rounded-full bg-ink text-[0.7rem] font-bold text-gold">
                      {review.initials}
                    </span>
                    <span className="text-[0.8rem] font-semibold">
                      {review.name}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}

            <Reveal delay={160}>
              <div className="flex h-full flex-col justify-between gap-4 rounded-[1.35rem] bg-ink p-6 text-cream">
                <div>
                  <p className="font-display text-5xl font-semibold text-gold">
                    5.0
                  </p>
                  <div className="mt-2 flex gap-0.5 text-gold">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="size-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-3 text-[0.85rem] leading-relaxed text-cream/65">
                    Rated by our Plano regulars on Google — the oxtails and the
                    daqs do the talking.
                  </p>
                </div>
                <a
                  href={SITE.reviewsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline text-gold"
                >
                  Leave a review <ArrowUpRight className="size-4" />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Visit */}
      <section className="py-20 sm:py-28">
        <div className="shell grid items-stretch gap-8 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <div className="flex h-full flex-col justify-center rounded-[1.5rem] border border-ink/10 bg-paper p-7 sm:p-10">
              <span className="eyebrow flex items-center gap-2 text-royal">
                <span className="h-px w-6 bg-gold" /> Find us
              </span>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-semibold leading-[1.04] tracking-[-0.02em]">
                Come hungry.
                <br />
                <span className="italic text-royal">Leave satisfied.</span>
              </h2>
              <p className="mt-4 max-w-md text-[0.9rem] leading-relaxed text-muted">
                {SITE.addressLine1}, {SITE.addressLine2}. Grab a booth, order a
                boil and stay for the vibes.
              </p>

              <div className="mt-6 space-y-1.5 rounded-xl border border-ink/8 bg-cream/60 p-4">
                {HOURS.map((day, index) => (
                  <div
                    key={day.day}
                    className="flex items-center justify-between gap-4 text-[0.82rem]"
                  >
                    <span
                      className={
                        index === status.todayIndex
                          ? "font-bold text-ink"
                          : "text-muted"
                      }
                    >
                      {day.day}
                      {index === status.todayIndex ? (
                        <span className="ml-2 rounded-full bg-gold/25 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-ink">
                          Today
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={
                        index === status.todayIndex
                          ? "font-bold text-ink"
                          : "text-muted"
                      }
                    >
                      {hoursLabel(day)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={SITE.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ink"
                >
                  Get directions <ArrowUpRight className="size-4" />
                </a>
                <a href={SITE.phoneHref} className="btn btn-outline">
                  <Phone className="size-4" /> {SITE.phone}
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="order-1 min-h-[320px] lg:order-2">
            <div className="relative h-full min-h-[320px] overflow-hidden rounded-[1.5rem] border border-ink/10">
              <iframe
                title="Map to Daqs & Oxtails in Plano, Texas"
                src={SITE.mapEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[320px] w-full grayscale-[35%]"
              />
              <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-cream/95 px-4 py-2 text-[0.72rem] font-bold shadow-lg">
                <UtensilsCrossed className="size-3.5 text-royal" />
                Plano · Preston &amp; Legacy
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="grain relative overflow-hidden bg-ink py-16 text-cream sm:py-20">
        <div className="pointer-events-none absolute -right-10 top-1/2 size-[24rem] -translate-y-1/2 rounded-full bg-gold/10 blur-[90px]" />
        <div className="shell relative z-10 flex flex-col items-center gap-6 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-gold/30 text-gold">
            <GlassMark className="size-6" />
          </span>
          <h2 className="max-w-2xl font-display text-[clamp(2.2rem,5.4vw,4rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
            Hungry yet? <span className="italic text-gold">We thought so.</span>
          </h2>
          <p className="max-w-md text-[0.9rem] text-cream/70">
            {ordering
              ? "Order pickup or delivery in a couple of taps. Daiquiris are blended fresh — bring your ID."
              : "Come see us on Preston Road, or call ahead and we'll have it ready. Daiquiris are blended fresh — bring your ID."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/menu" className="btn btn-gold">
              {ordering ? "Order now" : "See the menu"}{" "}
              <ArrowRight className="size-4" />
            </Link>
            <Link to="/visit" className="btn btn-outline-light">
              Hours &amp; directions
            </Link>
          </div>
        </div>
      </section>

      <ItemSheet item={active} onClose={() => setActive(null)} />
    </>
  );
}
