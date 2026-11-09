import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Phone,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { SITE } from "../data/site";
import { cn, money } from "../lib/format";
import { isOpenAt, pickupSlots } from "../lib/hours";
import { useCart } from "../store/cart";
import { useServing } from "../lib/serving";
import { MenuThumb } from "../components/MenuThumb";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type Errors = Partial<Record<"name" | "phone" | "address" | "zip", string>>;

const ASAP_LEAD_MS = 40 * 60 * 1000;

export function Checkout() {
  useDocumentTitle(
    "Checkout — Daqs & Oxtails",
    "Review your order from Daqs & Oxtails in Plano, Texas and choose pickup or delivery.",
  );

  const {
    lines,
    count,
    subtotal,
    fulfillment,
    setFulfillment,
    openCart,
  } = useCart();

  const slots = useMemo(() => pickupSlots(6), []);
  const canOrderAsap = useMemo(
    () => isOpenAt(new Date(Date.now() + ASAP_LEAD_MS)),
    [],
  );
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    zip: "",
    slot: canOrderAsap ? "asap" : (slots[0]?.value ?? ""),
    notes: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [onlinePayments, setOnlinePayments] = useState<boolean | null>(null);
  const [params] = useSearchParams();
  const serving = useServing();

  useEffect(() => {
    let active = true;
    fetch("/api/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config: { stripe?: boolean } | null) => {
        if (active && config) setOnlinePayments(Boolean(config.stripe));
      })
      .catch(() => {
        if (active) setOnlinePayments(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const deliveryFee = fulfillment === "delivery" ? SITE.deliveryFee : 0;
  const tax = Math.round(subtotal * SITE.taxRate * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
  const slotLabel =
    form.slot === "asap"
      ? "As soon as possible"
      : slots.find((slot) => slot.value === form.slot)?.label ?? "As soon as possible";

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const next: Errors = {};
    if (!form.name.trim()) next.name = "Tell us who the order is for.";
    if (form.phone.replace(/\D/g, "").length < 10) {
      next.phone = "We need a number the kitchen can call.";
    }
    if (fulfillment === "delivery") {
      if (!form.address.trim()) next.address = "Where are we delivering?";
      if (form.zip.replace(/\D/g, "").length !== 5) {
        next.zip = "Enter a 5-digit ZIP code.";
      }
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    if (!form.slot) {
      setNotice("Pick a time the kitchen is open before paying.");
      return;
    }

    setSubmitting(true);

    try {
      // The browser sends ids and quantities only — the Worker prices the
      // order from the same catalog the site was built from.
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({
            id: line.id,
            addons: line.addons.map((addon) => addon.id),
            qty: line.qty,
          })),
          fulfillment,
          when: slotLabel,
          // The Worker re-checks this instant against the opening hours.
          whenAt: form.slot === "asap" ? undefined : form.slot,
          notes: form.notes.trim(),
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
            zip: form.zip.trim(),
          },
        }),
      });

      if (response.status === 503) {
        setOnlinePayments(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        setNotice(
          payload.error ||
            "We couldn't start the payment. Please try again or call the kitchen.",
        );
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setNotice(
        "We couldn't reach the payment service. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Static hosting (cPanel/Apache) serves files only, so there is no endpoint
  // to place an order. Say so plainly instead of offering a dead button.
  if (serving === "static") {
    return (
      <section className="shell py-20 sm:py-28">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-cream-2 text-royal">
            <ShoppingBag className="size-7" strokeWidth={1.5} />
          </span>
          <h1 className="mt-5 font-display text-[clamp(1.9rem,4.4vw,2.6rem)] font-semibold leading-tight">
            Online ordering isn&apos;t available on this copy of the site.
          </h1>
          <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
            This version is served as plain files, so it can&apos;t take a card
            payment. Call the kitchen and we&apos;ll get your order started —
            pickup on Preston Road or delivery across Plano.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={SITE.phoneHref} className="btn btn-gold">
              <Phone className="size-4" /> Call {SITE.phone}
            </a>
            <Link to="/menu" className="btn btn-outline">
              Browse the menu <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (count === 0) {
    return (
      <section className="shell py-20 sm:py-28">
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-cream-2 text-royal">
            <ShoppingBag className="size-7" strokeWidth={1.5} />
          </span>
          <h1 className="mt-5 font-display text-[clamp(1.9rem,4.4vw,2.6rem)] font-semibold leading-tight">
            Nothing to check out yet.
          </h1>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">
            Add a plate of oxtails, a bowl of gumbo or a daq — then come back
            and we&apos;ll get it to you.
          </p>
          <Link to="/menu" className="btn btn-ink mt-6">
            Browse the menu <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="shell py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 text-[0.75rem] font-bold uppercase tracking-[0.16em] text-muted transition hover:text-royal"
          >
            <ArrowLeft className="size-3.5" /> Keep shopping
          </Link>

          <h1 className="mt-4 font-display text-[clamp(2.1rem,5vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
            Checkout
          </h1>
          <p className="mt-2 text-[0.9rem] text-muted">
            {count} item{count === 1 ? "" : "s"} · {money(subtotal)} in the bag
          </p>

          {params.get("canceled") && !notice ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-ink/12 bg-cream px-4 py-3 text-[0.82rem] leading-relaxed text-ink"
            >
              Payment was canceled, so nothing was charged. Your bag is still
              here whenever you're ready.
            </p>
          ) : null}

          {onlinePayments === false ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-clay/30 bg-clay/5 px-4 py-3 text-[0.82rem] leading-relaxed text-ink"
            >
              <strong className="font-semibold">
                Card payments aren't switched on yet.
              </strong>{" "}
              Nothing will be charged here — build your bag, then call the
              kitchen at {SITE.phone} to place and pay for it.
            </p>
          ) : null}

          {notice ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-clay/40 bg-clay/5 px-4 py-3 text-[0.82rem] leading-relaxed text-ink"
            >
              {notice}
            </p>
          ) : null}

          <form onSubmit={submit} noValidate className="mt-7 space-y-7">
            <fieldset>
              <legend className="eyebrow text-royal">How do you want it?</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "pickup" as const,
                      icon: ShoppingBag,
                      title: "Pickup",
                      copy: "8700 Preston Rd, Suite 127",
                      price: "Free",
                    },
                    {
                      value: "delivery" as const,
                      icon: Truck,
                      title: "Delivery",
                      copy: SITE.deliveryRadius,
                      price: money(SITE.deliveryFee),
                    },
                  ]
                ).map((option) => {
                  const Icon = option.icon;
                  const isOn = fulfillment === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                        isOn
                          ? "border-royal bg-royal/5"
                          : "border-ink/12 bg-paper hover:border-ink/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="fulfillment"
                        value={option.value}
                        checked={isOn}
                        onChange={() => setFulfillment(option.value)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
                          isOn
                            ? "bg-royal text-cream"
                            : "bg-cream-2 text-royal",
                        )}
                      >
                        <Icon className="size-4" strokeWidth={1.8} />
                      </span>
                      <span className="flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[0.9rem] font-bold">
                            {option.title}
                          </span>
                          <span className="text-[0.78rem] font-semibold text-muted">
                            {option.price}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[0.78rem] text-muted">
                          {option.copy}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="eyebrow text-royal">
                {fulfillment === "delivery" ? "When should we send it?" : "When will you be here?"}
              </legend>
              <div className="mt-3 flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-muted" />
                <select
                  value={form.slot}
                  onChange={(event) => update("slot", event.target.value)}
                  className="field"
                  aria-label="Order time"
                >
                  {canOrderAsap ? (
                    <option value="asap">As soon as possible (25–35 min)</option>
                  ) : null}
                  {slots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[0.72rem] leading-relaxed text-muted">
                Times reflect when the kitchen expects to have it ready, not
                delivery arrival. We only offer times we're open.
              </p>
              {!canOrderAsap ? (
                <p className="mt-2 rounded-lg bg-cream-2/70 px-3 py-2 text-[0.74rem] leading-relaxed text-ink">
                  We're closed right now, so ASAP isn't available — pick the
                  next time we're open.
                </p>
              ) : null}
            </fieldset>

            <fieldset>
              <legend className="eyebrow text-royal">Your details</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="checkout-name">
                    Name
                  </label>
                  <input
                    id="checkout-name"
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
                  <label className="label" htmlFor="checkout-phone">
                    Phone
                  </label>
                  <input
                    id="checkout-phone"
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
                  <label className="label" htmlFor="checkout-email">
                    Email <span className="normal-case text-muted">(optional)</span>
                  </label>
                  <input
                    id="checkout-email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    className="field"
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>

                {fulfillment === "delivery" ? (
                  <>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor="checkout-address">
                        Delivery address
                      </label>
                      <input
                        id="checkout-address"
                        value={form.address}
                        onChange={(event) => update("address", event.target.value)}
                        className={cn("field", errors.address && "border-clay")}
                        placeholder="Street address and apartment"
                        autoComplete="street-address"
                        aria-invalid={Boolean(errors.address)}
                      />
                      {errors.address ? (
                        <p role="alert" className="mt-1 text-[0.72rem] font-medium text-clay">
                          {errors.address}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className="label" htmlFor="checkout-zip">
                        ZIP code
                      </label>
                      <input
                        id="checkout-zip"
                        value={form.zip}
                        onChange={(event) => update("zip", event.target.value)}
                        className={cn("field", errors.zip && "border-clay")}
                        placeholder="75024"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        aria-invalid={Boolean(errors.zip)}
                      />
                      {errors.zip ? (
                        <p role="alert" className="mt-1 text-[0.72rem] font-medium text-clay">
                          {errors.zip}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="checkout-notes">
                    Notes for the kitchen
                  </label>
                  <textarea
                    id="checkout-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    className="field resize-none"
                    placeholder="Sauce on the side, no peppers, extra napkins…"
                  />
                </div>
              </div>
            </fieldset>

            <div className="rounded-xl border border-ink/8 bg-cream/70 p-4 text-[0.78rem] leading-relaxed text-muted">
              <p className="font-semibold text-ink">Payment &amp; pickup</p>
              <p className="mt-1">
                You finish paying on Stripe's secure checkout — we never see or
                store your card number. The kitchen starts your order once the
                payment clears, so please pay when you place it.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onlinePayments === false ? (
                // Without a payment key there is nothing to submit, so the
                // primary action is the one that actually works.
                <a
                  href={SITE.phoneHref}
                  className="btn btn-gold w-full sm:w-auto sm:flex-1"
                >
                  <Phone className="size-4" /> Call {SITE.phone} to order
                </a>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={submitting || !form.slot}
                    className="btn btn-gold w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:flex-1"
                  >
                    {submitting
                      ? "Opening secure checkout…"
                      : `Pay & place order · ${money(total)}`}
                    <ArrowRight className="size-4" />
                  </button>
                  <a href={SITE.phoneHref} className="btn btn-outline">
                    <Phone className="size-4" /> Call instead
                  </a>
                </>
              )}
            </div>
          </form>
        </div>

        <aside className="rounded-[1.5rem] border border-ink/10 bg-paper p-5 sm:p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3 border-b border-ink/8 pb-3">
            <h2 className="font-display text-xl font-semibold">Your order</h2>
            <button
              type="button"
              onClick={openCart}
              className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-royal transition hover:text-ink"
            >
              Edit
            </button>
          </div>

          <ul className="divide-y divide-ink/8">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-3 py-3.5">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-cream-2">
                  <MenuThumb
                    item={{ ...line, category: "", description: "", price: 0 }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.86rem] font-semibold leading-snug">
                    {line.qty} × {line.name}
                  </p>
                  {line.addons.length > 0 ? (
                    <p className="mt-0.5 text-[0.7rem] text-muted">
                      {line.addons.map((addon) => addon.label).join(" · ")}
                    </p>
                  ) : null}
                  {line.notes ? (
                    <p className="mt-0.5 text-[0.7rem] italic text-muted">
                      “{line.notes}”
                    </p>
                  ) : null}
                </div>
                <span className="text-[0.86rem] font-bold">
                  {money(line.unitPrice * line.qty)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-1.5 border-t border-ink/8 pt-3 text-[0.86rem]">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-semibold">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                {fulfillment === "delivery" ? "Delivery" : "Pickup"}
              </dt>
              <dd className="text-muted">
                {fulfillment === "delivery" ? money(SITE.deliveryFee) : "Free"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Tax</dt>
              <dd className="text-muted">{money(tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-ink/8 pt-2 text-[1rem]">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold">{money(total)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-[0.7rem] leading-relaxed text-muted">
            Daiquiris require a valid ID at pickup or delivery — 21+. Please
            drink responsibly.
          </p>
        </aside>
      </div>
    </section>
  );
}
