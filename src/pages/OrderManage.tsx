import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Phone,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { money } from "../lib/format";
import { SITE } from "../data/site";
import { HOURS } from "../lib/hours";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const PICKUP_HOURS_TEXT = "Tue–Thu 12–9 PM, Fri–Sat 12–10 PM, Sun 12–8 PM (closed Mondays)";

const isOpenAt = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const minutes =
    Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const day = HOURS.find((entry) => entry.day === weekday);

  return Boolean(
    day &&
      day.open !== null &&
      day.close !== null &&
      minutes >= day.open * 60 &&
      minutes < day.close * 60,
  );
};

type ManagedOrder = {
  orderId: string;
  name: string;
  requestedFor: string;
  fulfillment: string;
  kitchenStatus: string;
  status: string;
  amountTotal: number;
  currency: string;
  items: { name: string; qty: number; amount: number }[];
  notes: string;
  canChange: boolean;
  pickupAddress: string;
};

type Phase = "loading" | "invalid" | "ready" | "cancelled";

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;

const defaultWhen = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return toLocalInput(date);
};

export function OrderManage() {
  useDocumentTitle("Change your order — Daqs & Oxtails");

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";

  const [order, setOrder] = useState<ManagedOrder | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [when, setWhen] = useState(defaultWhen);
  const [busy, setBusy] = useState<"" | "reschedule" | "cancel">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    if (!sessionId || !token) {
      setPhase("invalid");
      return;
    }

    let active = true;
    fetch(`/api/order?sessionId=${encodeURIComponent(sessionId)}&t=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("invalid");
        return (await response.json()) as { order: ManagedOrder };
      })
      .then((data) => {
        if (!active) return;
        setOrder(data.order);
        setPhase(data.order.status === "refunded" ? "cancelled" : "ready");
      })
      .catch(() => {
        if (active) setPhase("invalid");
      });

    return () => {
      active = false;
    };
  }, [sessionId, token]);

  const reschedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId) return;

    if (!isOpenAt(new Date(when))) {
      setError(`We're closed at that time. Pickup hours: ${PICKUP_HOURS_TEXT}.`);
      setNotice("");
      return;
    }

    setBusy("reschedule");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/order/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, t: token, when: new Date(when).toISOString() }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        requestedFor?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "That time didn't save. Try again or call us.");
        return;
      }

      setOrder((current) => (current ? { ...current, requestedFor: payload.requestedFor ?? current.requestedFor } : current));
      setNotice(`Done — your order is now for ${payload.requestedFor}. The kitchen has been told.`);
    } catch {
      setError("We couldn't reach the kitchen. Try again in a moment.");
    } finally {
      setBusy("");
    }
  };

  const cancel = async () => {
    if (!sessionId) return;

    setBusy("cancel");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/order/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, t: token }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        refunded?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "We couldn't cancel that. Call us and we'll sort it out.");
        setConfirmingCancel(false);
        return;
      }

      setOrder((current) =>
        current ? { ...current, status: "refunded", kitchenStatus: "cancelled", canChange: false } : current,
      );
      setPhase("cancelled");
    } catch {
      setError("We couldn't reach the kitchen. Try again in a moment.");
    } finally {
      setBusy("");
    }
  };

  if (phase === "loading") {
    return (
      <section className="shell py-20">
        <div className="mx-auto max-w-md text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto size-7 animate-spin text-royal" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Finding your order…</h1>
        </div>
      </section>
    );
  }

  if (phase === "invalid" || !order) {
    return (
      <section className="shell py-16 sm:py-24">
        <div className="mx-auto max-w-lg rounded-[1.5rem] border border-ink/10 bg-paper p-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-cream-2 text-clay">
            <TriangleAlert className="size-6" strokeWidth={1.8} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">That link isn't working.</h1>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">
            It may be incomplete, or copied from an older email. Call the restaurant and we'll
            change or cancel the order for you.
          </p>
          <a href={SITE.phoneHref} className="btn btn-ink mt-5">
            <Phone className="size-4" /> Call {SITE.phone}
          </a>
        </div>
      </section>
    );
  }

  const total = money(order.amountTotal / 100);
  const started = order.kitchenStatus !== "new";

  return (
    <section className="shell py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow text-royal">Your order</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,2.9rem)] font-semibold leading-tight tracking-[-0.02em]">
          {order.orderId}
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          {order.fulfillment === "delivery" ? "Delivery" : "Pickup"} · for{" "}
          <span className="font-semibold text-ink">{order.requestedFor || "ASAP"}</span> ·{" "}
          {total} paid
        </p>

        {phase === "cancelled" ? (
          <div className="mt-6 rounded-[1.25rem] border border-emerald-600/30 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 font-display text-lg font-semibold text-emerald-900">
              <CheckCircle2 className="size-5" /> Cancelled and refunded
            </p>
            <p className="mt-1 text-[0.88rem] leading-relaxed text-emerald-900/80">
              {total} is going back to your card. Refunds usually land in 5–10 business days. The
              kitchen has been told not to prepare it.
            </p>
          </div>
        ) : null}

        <ul className="mt-6 divide-y divide-ink/8 rounded-[1.25rem] border border-ink/10 bg-paper px-5">
          {order.items.map((item, index) => (
            <li key={`${order.orderId}-${index}`} className="flex justify-between gap-4 py-3 text-[0.9rem]">
              <span>
                <span className="font-semibold">{item.qty}×</span> {item.name}
              </span>
              <span className="text-muted">{money((item.amount || 0) / 100)}</span>
            </li>
          ))}
          {order.items.length === 0 ? (
            <li className="py-3 text-[0.88rem] text-muted">Line items are on your Stripe receipt.</li>
          ) : null}
        </ul>

        {order.notes ? (
          <p className="mt-3 rounded-xl bg-cream-2/60 px-4 py-3 text-[0.84rem] leading-relaxed">
            <span className="font-semibold">Your notes:</span> {order.notes}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-5 rounded-xl border border-clay/40 bg-clay/5 px-4 py-3 text-[0.86rem] text-ink">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p role="status" className="mt-5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-[0.86rem] text-emerald-900">
            {notice}
          </p>
        ) : null}

        {phase !== "cancelled" && order.canChange ? (
          <>
            <div className="mt-8 rounded-[1.25rem] border border-ink/10 bg-paper p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <CalendarClock className="size-5 text-royal" /> Moves your pickup time
              </h2>
              <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">
                Pick a new time for {order.pickupAddress}. At least 30 minutes ahead, within two
                weeks, during pickup hours. You can change it yourself until the kitchen starts
                cooking.
              </p>

              <form onSubmit={reschedule} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="label" htmlFor="new-time">
                    New pickup time
                  </label>
                  <input
                    id="new-time"
                    type="datetime-local"
                    className="field"
                    value={when}
                    min={toLocalInput(new Date(Date.now() + 30 * 60 * 1000))}
                    max={toLocalInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))}
                    onChange={(event) => setWhen(event.target.value)}
                    required
                  />
                  <p className="mt-2 text-[0.76rem] leading-relaxed text-muted">
                    Pickup hours: {PICKUP_HOURS_TEXT}.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={busy !== "" || !when}
                  className="btn btn-ink disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {busy === "reschedule" ? "Saving…" : "Move my order"}
                </button>
              </form>
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-clay/25 bg-paper p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <XCircle className="size-5 text-clay" /> Cancel and refund
              </h2>
              <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">
                Cancelling refunds the full {total} to the card you paid with. You can do this
                until the kitchen starts cooking.
              </p>

              {confirmingCancel ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void cancel()}
                    disabled={busy !== ""}
                    className="btn btn-ink bg-clay hover:bg-clay disabled:opacity-70"
                  >
                    {busy === "cancel" ? "Refunding…" : `Yes, cancel and refund ${total}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    disabled={busy !== ""}
                    className="btn btn-outline"
                  >
                    Keep my order
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="btn btn-outline mt-4"
                >
                  Cancel this order
                </button>
              )}
            </div>
          </>
        ) : null}

        {phase !== "cancelled" && !order.canChange ? (
          <div className="mt-8 rounded-[1.25rem] border border-ink/10 bg-paper p-6">
            <p className="font-display text-lg font-semibold">
              {started ? "This order is already being prepared." : "Changes need a quick call."}
            </p>
            <p className="mt-1 text-[0.88rem] leading-relaxed text-muted">
              {started
                ? "The kitchen has started it, so it can't be rescheduled or cancelled here."
                : "Delivery orders are handled by the kitchen."}{" "}
              Call {SITE.phone} and we'll help.
            </p>
            <a href={SITE.phoneHref} className="btn btn-ink mt-4">
              <Phone className="size-4" /> Call {SITE.phone}
            </a>
          </div>
        ) : null}

        <p className="mt-6 text-[0.74rem] leading-relaxed text-muted">
          This link is personal to your order — please don't forward it. Paid orders only; the
          amount refunded is the amount you paid.
        </p>
      </div>
    </section>
  );
}
