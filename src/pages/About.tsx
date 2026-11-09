import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Phone, Star } from "lucide-react";
import { SITE } from "../data/site";
import { Reveal } from "../components/Reveal";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const craft = [
  {
    step: "01",
    title: "The braise",
    copy: "Oxtails seared, then left low in a seasoned braise until the meat gives way to a fork. No shortcuts, no pressure cookers — just time doing the work.",
  },
  {
    step: "02",
    title: "The roux",
    copy: "Gumbo starts with flour and fat stirred until it hits the colour of a copper penny. That pot is the reason the bowl tastes like Louisiana instead of a bag of seasoning.",
  },
  {
    step: "03",
    title: "The pour",
    copy: "Daiquiris are blended when you order them — not scooped from a machine that has been turning since lunch. Cold, bright, and made for the plate in front of you.",
  },
];

const values = [
  {
    title: "Authenticity",
    copy: "Recipes we grew up on, seasoned the way our families seasoned them.",
  },
  {
    title: "Taste",
    copy: "If it isn't the best version of the dish we can make, it doesn't leave the kitchen.",
  },
  {
    title: "Tradition",
    copy: "Sunday-dinner cooking, served any day you walk through the door.",
  },
  {
    title: "Excellence",
    copy: "From the first greeting to the last bite — we care about all of it.",
  },
];

const gallery = [
  {
    src: "/img/menu-plate.jpg",
    alt: "Cajun boil tray with shrimp, corn, sausage and potato",
    label: "The boil",
  },
  {
    src: "/img/wings.jpg",
    alt: "Sauced wings with seasoned crinkle fries",
    label: "The wings",
  },
  {
    src: "/img/oxtail-pasta.jpg",
    alt: "Oxtail pasta topped with braised oxtail and herbs",
    label: "The pasta",
  },
];

export function About() {
  useDocumentTitle(
    "Our story — Daqs & Oxtails, Plano TX",
    "A Black-owned soul food and Cajun kitchen on Preston Road in Plano — slow-braised oxtails, real roux gumbo and daiquiris blended to order.",
  );

  return (
    <>
      <section className="grain relative overflow-hidden bg-ink pb-16 pt-12 text-cream sm:pb-20 sm:pt-16">
        <div className="pointer-events-none absolute -left-32 top-0 size-[30rem] rounded-full bg-royal/30 blur-[110px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 size-[22rem] rounded-full bg-gold/10 blur-[100px]" />

        <div className="shell relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="eyebrow flex items-center gap-2 text-gold">
              <span className="h-px w-6 bg-gold/60" /> Our story
            </span>
            <h1 className="mt-4 font-display text-[clamp(2.6rem,6.6vw,4.9rem)] font-semibold leading-[0.94] tracking-[-0.035em]">
              Soul food,
              <br />
              seasoned by
              <br />
              <span className="italic text-gold">memory.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[0.98rem] leading-relaxed text-cream/70">
              Daqs &amp; Oxtails is a Black-owned kitchen on Preston Road,
              serving Plano the food we grew up on — oxtails braised until they
              give, gumbo built from a real roux, and daiquiris blended the
              moment you order one.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/menu" className="btn btn-gold">
                See what&apos;s cooking <ArrowRight className="size-4" />
              </Link>
              <Link to="/visit" className="btn btn-outline-light">
                Hours &amp; directions
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-cream/10 pt-7">
              <div>
                <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-cream/65">
                  Google rating
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 font-display text-2xl font-semibold">
                  5.0
                  <Star className="size-3.5 fill-gold text-gold" />
                </dd>
              </div>
              <div>
                <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-cream/65">
                  On the menu
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold">
                  20+ dishes
                </dd>
              </div>
              <div>
                <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-cream/65">
                  Kitchen
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold">
                  Plano, TX
                </dd>
              </div>
            </dl>
          </div>

          <Reveal className="relative mx-auto w-full max-w-[430px] lg:mr-2">
            <div className="pointer-events-none absolute -inset-3 rounded-[2rem] border border-gold/20" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-cream/10">
              <img
                src="/img/interior.jpg"
                alt="The dining room at Daqs & Oxtails in Plano, Texas"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
              <div className="absolute inset-x-5 bottom-5">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.24em] text-gold">
                  The room
                </p>
                <p className="mt-1 font-display text-lg">
                  Come as you are. Stay for the music.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <span className="eyebrow flex items-center gap-2 text-royal">
              <span className="h-px w-6 bg-gold" /> Why we cook
            </span>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
              The food you grew up on deserves{" "}
              <span className="italic text-royal">the nice plate.</span>
            </h2>
          </Reveal>

          <Reveal delay={90} className="space-y-4">
            <p className="text-[0.98rem] leading-relaxed text-muted">
              Soul food gets treated like an afterthought in a lot of kitchens —
              held under a lamp, ladled from a steam table, priced like it cost
              nothing to make. We opened Daqs &amp; Oxtails to push back on
              that.
            </p>
            <p className="text-[0.98rem] leading-relaxed text-muted">
              Here, the greens are simmered slow with smoked turkey. The yams
              are candied down with brown sugar until they glaze. The mac has a
              real cheese pull because it is baked, not stirred. And the Cajun
              half of the menu is just as serious — cornmeal-crusted catfish,
              boils in Mr. Cajun butter, and a gumbo that started as a roux
              before it ever became a soup.
            </p>
            <p className="text-[0.98rem] leading-relaxed text-muted">
              Then there are the daqs. Frozen, blended to order, and strong
              enough to earn their reputation. It is a restaurant built for
              people who want a real dinner and a good time in the same
              evening — families on a Sunday, friends on a Friday, and everyone
              who came for the oxtails and stayed for the vibe.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {craft.map((entry, index) => (
            <Reveal key={entry.step} delay={index * 80}>
              <div className="flex h-full flex-col gap-3 rounded-[1.35rem] border border-ink/10 bg-paper p-6">
                <span className="font-display text-3xl font-semibold text-gold">
                  {entry.step}
                </span>
                <h3 className="font-display text-xl font-semibold">
                  {entry.title}
                </h3>
                <p className="text-[0.86rem] leading-relaxed text-muted">
                  {entry.copy}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-ink/8 bg-cream-2/60 py-16 sm:py-20">
        <div className="shell grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="relative">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-ink/10">
              <img
                src="/img/founder.jpg"
                alt="Renee Hudson, founder of Daqs & Oxtails"
                className="aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-5 left-4 rounded-2xl border border-ink/10 bg-paper px-4 py-3 shadow-lg">
              <p className="font-display text-[0.95rem] font-semibold">
                Renee Hudson
              </p>
              <p className="text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                CEO &amp; founder
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <span className="eyebrow flex items-center gap-2 text-royal">
              <span className="h-px w-6 bg-gold" /> From the owner
            </span>
            <blockquote className="mt-4 font-display text-[clamp(1.5rem,3.1vw,2.2rem)] font-medium leading-[1.25] tracking-[-0.01em] text-ink/90">
              “Authenticity and taste converge here, so every meal is a journey
              of pure culinary delight. We don&apos;t just serve food — we serve
              the feeling of being fed by someone who wanted you full.”
            </blockquote>
            <p className="mt-5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
              Renee Hudson · CEO, Daqs &amp; Oxtails
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="rounded-xl border border-ink/8 bg-paper p-4"
                >
                  <p className="flex items-center gap-2 font-display text-[1.02rem] font-semibold">
                    <span className="size-1.5 rounded-full bg-gold" />
                    {value.title}
                  </p>
                  <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted">
                    {value.copy}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow flex items-center gap-2 text-royal">
                <span className="h-px w-6 bg-gold" /> From our kitchen
              </span>
              <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
                Plated the way we&apos;d eat it.
              </h2>
            </div>
            <Link to="/menu" className="link-underline text-ink">
              Full menu <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {gallery.map((shot, index) => (
            <Reveal key={shot.src} delay={index * 80}>
              <figure className="group relative overflow-hidden rounded-[1.35rem] border border-ink/10">
                <img
                  src={shot.src}
                  alt={shot.alt}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent px-4 pb-4 pt-12 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cream">
                  {shot.label}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="grain relative overflow-hidden bg-royal py-16 text-cream sm:py-20">
        <div className="pointer-events-none absolute -right-16 -top-20 size-80 rounded-full border border-cream/10" />
        <div className="pointer-events-none absolute -bottom-24 left-10 size-72 rounded-full border border-cream/10" />
        <div className="shell relative z-10 grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="eyebrow flex items-center gap-2 text-gold">
              <span className="h-px w-6 bg-gold/60" /> Sit with us
            </span>
            <h2 className="mt-3 max-w-xl font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
              A table, a plate,{" "}
              <span className="italic text-gold">a cold daq.</span>
            </h2>
            <p className="mt-4 max-w-md text-[0.92rem] leading-relaxed text-cream/70">
              We&apos;re on Preston Road in Plano. Walk in for dinner, call
              ahead for a crowd, or order pickup and take the whole thing home.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link to="/menu" className="btn btn-gold">
              Order online <ArrowRight className="size-4" />
            </Link>
            <a href={SITE.phoneHref} className="btn btn-outline-light">
              <Phone className="size-4" /> {SITE.phone}
            </a>
            <a
              href={SITE.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-light"
            >
              Directions <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
