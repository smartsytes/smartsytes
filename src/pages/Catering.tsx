import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Truck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { SITE } from "../data/site";
import {
  cateringExtras,
  cateringFaqs,
  cateringPackages,
  cateringSteps,
} from "../data/catering";
import { cn, money } from "../lib/format";
import { Reveal } from "../components/Reveal";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type InquiryErrors = Partial<
  Record<"name" | "phone" | "date" | "headcount", string>
>;

const formatDate = (value: string) => {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export function Catering() {
  useDocumentTitle(
    "Catering & party trays — Daqs & Oxtails, Plano TX",
    "Oxtails by the tray, boils by the pound, wings by the fifty and gallon daqs. Catering for offices, parties and family gatherings in Plano, Frisco and North Dallas.",
  );

  const minDate = useMemo(() => {
    const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }, []);

  const [selected, setSelected] = useState(cateringPackages[0].id);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    date: "",
    headcount: "",
    fulfillment: "pickup" as "pickup" | "delivery",
    notes: "",
  });
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [sent, setSent] = useState(false);

  const packageName =
    cateringPackages.find((entry) => entry.id === selected)?.name ??
    "Custom tray list";

  const scrollToForm = () => {
    document
      .getElementById("inquiry")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const choosePackage = (id: string) => {
    setSelected(id);
    scrollToForm();
  };

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: InquiryErrors = {};
    if (!form.name.trim()) next.name = "Who should we ask for?";
    if (form.phone.replace(/\D/g, "").length < 10) {
      next.phone = "Add a number the kitchen can reach you on.";
    }
    if (!form.date) {
      next.date = "Pick the date you need it.";
    } else if (form.date < minDate) {
      next.date = "Trays need at least 48 hours' notice.";
    }
    const headcount = Number(form.headcount);
    if (!headcount || headcount < 1) {
      next.headcount = "Roughly how many people are you feeding?";
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSent(true);
  };

  return (
    <>
      <section className="grain relative overflow-hidden bg-ink pb-16 pt-12 text-cream sm:pb-20 sm:pt-16">
        <div className="pointer-events-none absolute -left-28 top-0 size-[30rem] rounded-full bg-royal/30 blur-[110px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-[24rem] rounded-full bg-gold/10 blur-[100px]" />

        <div className="shell relative z-10 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <span className="eyebrow flex items-center gap-2 text-gold">
              <span className="h-px w-6 bg-gold/60" /> Catering &amp; party trays
            </span>
            <h1 className="mt-4 font-display text-[clamp(2.7rem,6.6vw,4.8rem)] font-semibold leading-[0.93] tracking-[-0.035em]">
              Feed the
              <br />
              <span className="italic text-gold">whole room.</span>
            </h1>
            <p className="mt-6 max-w-md text-[0.98rem] leading-relaxed text-cream/70">
              Oxtails by the tray, boils by the pound, wings by the fifty and
              gallon daqs to match. Built for offices, birthdays, repasts and
              game day — cooked to order from our Preston Road kitchen.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={scrollToForm} className="btn btn-gold">
                Request a quote <ArrowRight className="size-4" />
              </button>
              <a href={SITE.phoneHref} className="btn btn-outline-light">
                <Phone className="size-4" /> {SITE.phone}
              </a>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-5 border-t border-cream/10 pt-7">
              <div>
                <dt className="flex items-center gap-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-cream/65">
                  <Clock className="size-3" /> Notice
                </dt>
                <dd className="mt-1 font-display text-xl font-semibold">
                  48 hours
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-cream/65">
                  <Users className="size-3" /> Trays feed
                </dt>
                <dd className="mt-1 font-display text-xl font-semibold">
                  10–50
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-cream/65">
                  <Truck className="size-3" /> Delivery
                </dt>
                <dd className="mt-1 font-display text-xl font-semibold">
                  Plano &amp; Frisco
                </dd>
              </div>
            </dl>
          </div>

          <Reveal className="relative mx-auto w-full max-w-[440px]">
            <div className="pointer-events-none absolute -inset-3 rounded-[2rem] border border-gold/20" />
            <div className="relative aspect-[4/3.4] overflow-hidden rounded-[1.6rem] border border-cream/10">
              <img
                src="/img/menu-plate.jpg"
                alt="Cajun boil tray with shrimp, corn, sausage and potato"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
              <div className="absolute inset-x-5 bottom-5">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.24em] text-gold">
                  Party trays
                </p>
                <p className="mt-1 font-display text-lg">
                  Packed hot. Ready when you are.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow flex items-center gap-2 text-royal">
                <span className="h-px w-6 bg-gold" /> Start here
              </span>
              <h2 className="mt-3 max-w-xl font-display text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
                Four ways to feed a crowd.
              </h2>
              <p className="mt-3 max-w-lg text-[0.9rem] leading-relaxed text-muted">
                These are starting packages, not a fixed menu. Trays are sized
                to your headcount and the kitchen confirms the final quote
                before anything is cooked.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {cateringPackages.map((entry, index) => (
            <Reveal key={entry.id} delay={index * 70}>
              <article className="group flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-ink/10 bg-paper transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_54px_-34px_rgba(11,20,36,0.55)]">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={entry.image}
                    alt={entry.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                  {entry.badge ? (
                    <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-ink">
                      {entry.badge}
                    </span>
                  ) : null}
                  <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
                    <h3 className="font-display text-[1.35rem] font-semibold leading-tight text-cream">
                      {entry.name}
                    </h3>
                    <span className="shrink-0 rounded-full bg-cream/95 px-3 py-1 text-[0.72rem] font-bold text-ink">
                      from {money(entry.priceFrom)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                    <Users className="size-3.5 text-royal" /> {entry.feeds}
                  </div>
                  <p className="text-[0.86rem] italic text-ink/70">
                    {entry.tagline}
                  </p>
                  <ul className="mt-1 space-y-1.5">
                    {entry.includes.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-[0.84rem] leading-snug text-muted"
                      >
                        <Check
                          className="mt-0.5 size-3.5 shrink-0 text-royal"
                          strokeWidth={2.6}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => choosePackage(entry.id)}
                    className="link-underline mt-auto pt-3 text-royal"
                  >
                    Ask about this package <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-ink/8 bg-cream-2/60 py-14 sm:py-20">
        <div className="shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="eyebrow flex items-center gap-2 text-royal">
              <span className="h-px w-6 bg-gold" /> Build it out
            </span>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.8vw,2.7rem)] font-semibold leading-[1.03] tracking-[-0.02em]">
              Add a tray
              <br />
              <span className="italic text-royal">or two.</span>
            </h2>
            <p className="mt-3 max-w-sm text-[0.9rem] leading-relaxed text-muted">
              Sides and desserts travel well and round out any package. Ask for
              the current tray pricing when you send your request.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={scrollToForm} className="btn btn-ink">
                Add to my quote <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {cateringExtras.map((extra) => (
              <li
                key={extra.name}
                className="rounded-xl border border-ink/8 bg-paper p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[0.9rem] font-semibold leading-snug">
                    {extra.name}
                  </p>
                  <span className="shrink-0 text-[0.8rem] font-bold text-royal">
                    {extra.price ? money(extra.price) : "Quote"}
                  </span>
                </div>
                <p className="mt-1 text-[0.76rem] text-muted">{extra.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow flex items-center gap-2 text-royal">
                <span className="h-px w-6 bg-gold" /> How it works
              </span>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.9rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
                From first call to full trays.
              </h2>
            </div>
            <a href={SITE.phoneHref} className="link-underline text-ink">
              <Phone className="size-4" /> {SITE.phone}
            </a>
          </div>
        </Reveal>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cateringSteps.map((step, index) => (
            <Reveal key={step.step} delay={index * 70}>
              <div className="flex h-full flex-col gap-2 rounded-[1.3rem] border border-ink/10 bg-paper p-5">
                <span className="font-display text-2xl font-semibold text-gold">
                  {step.step}
                </span>
                <h3 className="font-display text-[1.1rem] font-semibold">
                  {step.title}
                </h3>
                <p className="text-[0.82rem] leading-relaxed text-muted">
                  {step.copy}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-6 rounded-xl border border-ink/8 bg-cream/70 p-4 text-[0.8rem] leading-relaxed text-muted">
          <strong className="text-ink">Payment policy.</strong> {SITE.policy}
        </p>
      </section>

      <section
        id="inquiry"
        className="scroll-mt-24 border-y border-ink/8 bg-cream-2/50 py-16 sm:py-20"
      >
        <div className="shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span className="eyebrow flex items-center gap-2 text-royal">
              <span className="h-px w-6 bg-gold" /> Request a quote
            </span>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
              Tell us the date.
              <br />
              <span className="italic text-royal">We&apos;ll handle the rest.</span>
            </h2>
            <p className="mt-4 max-w-md text-[0.92rem] leading-relaxed text-muted">
              Send the details and the kitchen will come back with a tray list
              and a firm total — usually the same business day. Need it sooner
              than 48 hours out? Call and ask; sometimes the answer is yes.
            </p>

            <ul className="mt-7 space-y-4 text-[0.88rem]">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-royal" />
                <div>
                  <p className="font-semibold">Call the kitchen</p>
                  <a
                    href={SITE.phoneHref}
                    className="text-muted transition hover:text-royal"
                  >
                    {SITE.phone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-royal" />
                <div>
                  <p className="font-semibold">Pickup &amp; delivery</p>
                  <p className="text-muted">
                    {SITE.addressLine1}, {SITE.addressLine2}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-royal" />
                <div>
                  <p className="font-semibold">Notice</p>
                  <p className="text-muted">
                    48 hours for trays · about a week for boils
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {sent ? (
            <div className="rounded-[1.5rem] border border-ink/10 bg-paper p-7 text-center sm:p-9">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold text-ink">
                <CheckCircle2 className="size-7" strokeWidth={2} />
              </span>
              <h3 className="mt-5 font-display text-[1.8rem] font-semibold leading-tight">
                Request noted, {form.name.split(" ")[0]}.
              </h3>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
                {packageName} · {form.headcount} people ·{" "}
                {formatDate(form.date)} ·{" "}
                {form.fulfillment === "delivery" ? "delivery" : "pickup on Preston Road"}.
              </p>
              <div className="mt-5 rounded-xl border border-ink/8 bg-cream/70 p-4 text-left text-[0.8rem] leading-relaxed text-muted">
                <p className="font-semibold text-ink">One honest note</p>
                <p className="mt-1">
                  This page is a design preview and does not send email. Call
                  the kitchen at {SITE.phone} to lock in the date, or reply from
                  your own email once the form is connected.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a href={SITE.phoneHref} className="btn btn-gold">
                  <Phone className="size-4" /> Call {SITE.phone}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setForm({
                      name: "",
                      phone: "",
                      email: "",
                      date: "",
                      headcount: "",
                      fulfillment: "pickup",
                      notes: "",
                    });
                  }}
                  className="btn btn-outline"
                >
                  Send another request
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={submit}
              noValidate
              className="rounded-[1.5rem] border border-ink/10 bg-paper p-6 sm:p-7"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="catering-name">
                    Name
                  </label>
                  <input
                    id="catering-name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    className={cn("field", errors.name && "border-clay")}
                    placeholder="First and last name"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name ? (
                    <p role="alert" className="mt-1 text-[0.72rem] font-medium text-clay">
                      {errors.name}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="label" htmlFor="catering-phone">
                    Phone
                  </label>
                  <input
                    id="catering-phone"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    className={cn("field", errors.phone && "border-clay")}
                    placeholder="(972) 555-0134"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone ? (
                    <p role="alert" className="mt-1 text-[0.72rem] font-medium text-clay">
                      {errors.phone}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="catering-email">
                    Email{" "}
                    <span className="normal-case text-muted">(optional)</span>
                  </label>
                  <input
                    id="catering-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    className="field"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="catering-date">
                    Date needed
                  </label>
                  <input
                    id="catering-date"
                    type="date"
                    min={minDate}
                    value={form.date}
                    onChange={(event) => update("date", event.target.value)}
                    className={cn("field", errors.date && "border-clay")}
                    aria-invalid={Boolean(errors.date)}
                  />
                  {errors.date ? (
                    <p role="alert" className="mt-1 text-[0.72rem] font-medium text-clay">
                      {errors.date}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="label" htmlFor="catering-headcount">
                    Headcount
                  </label>
                  <input
                    id="catering-headcount"
                    type="number"
                    min={1}
                    value={form.headcount}
                    onChange={(event) => update("headcount", event.target.value)}
                    className={cn("field", errors.headcount && "border-clay")}
                    placeholder="25"
                    inputMode="numeric"
                    aria-invalid={Boolean(errors.headcount)}
                  />
                  {errors.headcount ? (
                    <p role="alert" className="mt-1 text-[0.72rem] font-medium text-clay">
                      {errors.headcount}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="catering-package">
                    Package
                  </label>
                  <select
                    id="catering-package"
                    value={selected}
                    onChange={(event) => setSelected(event.target.value)}
                    className="field"
                  >
                    {cateringPackages.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} — {entry.feeds}
                      </option>
                    ))}
                    <option value="custom">Something else / custom list</option>
                  </select>
                </div>

                <fieldset className="sm:col-span-2">
                  <legend className="label">Pickup or delivery</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        { value: "pickup" as const, icon: UtensilsCrossed, label: "Pickup on Preston Rd" },
                        { value: "delivery" as const, icon: Truck, label: "Deliver to us" },
                      ]
                    ).map((option) => {
                      const Icon = option.icon;
                      const isOn = form.fulfillment === option.value;
                      return (
                        <label
                          key={option.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-[0.84rem] font-medium transition",
                            isOn
                              ? "border-royal bg-royal/5"
                              : "border-ink/10 bg-cream/40 hover:border-ink/25",
                          )}
                        >
                          <input
                            type="radio"
                            name="catering-fulfillment"
                            value={option.value}
                            checked={isOn}
                            onChange={() =>
                              update("fulfillment", option.value)
                            }
                            className="sr-only"
                          />
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              isOn ? "text-royal" : "text-muted",
                            )}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="catering-notes">
                    Anything else?
                  </label>
                  <textarea
                    id="catering-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    className="field resize-none"
                    placeholder="Allergies, extra sauce, a drop-off address, dietary swaps…"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-gold mt-5 w-full">
                Send my request <ArrowRight className="size-4" />
              </button>
              <p className="mt-3 text-center text-[0.72rem] leading-relaxed text-muted">
                No payment now — we confirm the tray list and total first.
              </p>
            </form>
          )}
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="eyebrow flex items-center gap-2 text-royal">
              <span className="h-px w-6 bg-gold" /> Good to know
            </span>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.8vw,2.7rem)] font-semibold leading-[1.03] tracking-[-0.02em]">
              Catering{" "}
              <span className="italic text-royal">questions.</span>
            </h2>
            <Link to="/menu" className="link-underline mt-5 text-ink">
              Browse the full menu <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {cateringFaqs.map((faq) => (
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
        <div className="pointer-events-none absolute -bottom-24 left-10 size-72 rounded-full border border-cream/10" />
        <div className="shell relative z-10 flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
              Big order. <span className="italic text-gold">Bigger table.</span>
            </h2>
            <p className="mt-3 max-w-md text-[0.9rem] leading-relaxed text-cream/70">
              Tell us the headcount and the date — we&apos;ll tell you exactly
              what it takes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={scrollToForm} className="btn btn-gold">
              Request a quote <ArrowRight className="size-4" />
            </button>
            <a href={SITE.phoneHref} className="btn btn-outline-light">
              <Phone className="size-4" /> {SITE.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
