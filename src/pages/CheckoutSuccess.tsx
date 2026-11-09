import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
} from "lucide-react";
import { SITE } from "../data/site";
import { money } from "../lib/format";
import { useCart } from "../store/cart";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type SessionInfo = {
  status: string;
  amountTotal: number | null;
  currency: string | null;
  email: string | null;
  orderId: string | null;
  fulfillment: string | null;
  when: string | null;
  name: string | null;
};

type Phase = "loading" | "paid" | "pending" | "missing" | "error";

export function CheckoutSuccess() {
  useDocumentTitle(
    "Order confirmed — Daqs & Oxtails",
    "Your Daqs & Oxtails payment and pickup details.",
  );

  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { clear } = useCart();
  const cleared = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setPhase("missing");
      return;
    }

    let active = true;

    fetch(`/api/checkout/session?id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | (SessionInfo & { error?: string })
          | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error || "We couldn't confirm that payment.");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setInfo(payload);
        const paid =
          payload.status === "paid" || payload.status === "no_payment_required";
        setPhase(paid ? "paid" : "pending");
        if (paid && !cleared.current) {
          cleared.current = true;
          clear();
        }
      })
      .catch((error: Error) => {
        if (!active) return;
        setMessage(error.message);
        setPhase("error");
      });

    return () => {
      active = false;
    };
  }, [sessionId, clear]);

  const total =
    info?.amountTotal != null ? money(info.amountTotal / 100) : null;
  const firstName = info?.name ? info.name.split(" ")[0] : null;
  const mode = info?.fulfillment === "delivery" ? "Delivery" : "Pickup";

  return (
    <section className="shell py-16 sm:py-24">
      <div className="mx-auto max-w-xl rounded-[1.75rem] border border-ink/10 bg-paper p-7 sm:p-10">
        {phase === "loading" ? (
          <div className="py-6 text-center" role="status" aria-live="polite">
            <Loader2 className="mx-auto size-7 animate-spin text-royal" />
            <h1 className="mt-4 font-display text-2xl font-semibold">
              Confirming your payment…
            </h1>
            <p className="mt-2 text-[0.9rem] text-muted">
              Give us a second while we check with the card processor.
            </p>
          </div>
        ) : null}

        {phase === "paid" ? (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold text-ink">
              <CheckCircle2 className="size-7" strokeWidth={2} />
            </span>
            {info?.orderId ? (
              <p className="mt-5 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-royal">
                Order {info.orderId}
              </p>
            ) : null}
            <h1 className="mt-2 font-display text-[clamp(1.9rem,4.4vw,2.8rem)] font-semibold leading-[1.03] tracking-[-0.02em]">
              {firstName ? `Thanks, ${firstName}. ` : "You're all set. "}
              <span className="italic text-royal">Paid in full.</span>
            </h1>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
              {total ? (
                <>
                  We charged <strong className="text-ink">{total}</strong> and
                  sent the ticket to the kitchen.{" "}
                </>
              ) : (
                "Your payment cleared and the ticket is with the kitchen. "
              )}
              {mode} for{" "}
              <strong className="text-ink">{info?.when ?? "as soon as possible"}</strong>.
              {info?.email
                ? " A receipt is on its way to your email."
                : " Bring your order number with you."}
            </p>

            <div className="mt-6 rounded-xl border border-ink/8 bg-cream/70 p-4 text-left text-[0.82rem] leading-relaxed text-muted">
              <p className="font-semibold text-ink">Before you head over</p>
              <p className="mt-1">
                Daiquiris need a valid ID at pickup — 21 and over only. If
                anything on the ticket needs a change, call the kitchen at{" "}
                {SITE.phone} and have order {info?.orderId ?? "number"} ready.
              </p>
            </div>
          </div>
        ) : null}

        {phase === "pending" ? (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-cream-2 text-royal">
              <Clock className="size-7" strokeWidth={1.8} />
            </span>
            <h1 className="mt-5 font-display text-[clamp(1.8rem,4.2vw,2.5rem)] font-semibold leading-tight">
              Payment is still processing.
            </h1>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
              The card processor hasn't marked this order paid yet. If you were
              charged, the kitchen will have it in a moment — call {SITE.phone}
              and they can check the ticket by order number.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-gold"
              >
                Check again
              </button>
              <a href={SITE.phoneHref} className="btn btn-outline">
                <Phone className="size-4" /> Call the kitchen
              </a>
            </div>
          </div>
        ) : null}

        {phase === "missing" || phase === "error" ? (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-cream-2 text-clay">
              <AlertCircle className="size-7" strokeWidth={1.8} />
            </span>
            <h1 className="mt-5 font-display text-[clamp(1.8rem,4.2vw,2.5rem)] font-semibold leading-tight">
              We couldn't confirm that order.
            </h1>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
              {message ||
                "This link is missing its checkout reference — it may have been opened from an old tab."}{" "}
              Nothing was charged twice: if a payment went through, the kitchen
              can find it by your name and phone number.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={SITE.phoneHref} className="btn btn-gold">
                <Phone className="size-4" /> Call {SITE.phone}
              </a>
              <Link to="/menu" className="btn btn-outline">
                Back to the menu <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ) : null}

        {phase === "paid" ? (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={SITE.phoneHref} className="btn btn-outline">
              <Phone className="size-4" /> Call {SITE.phone}
            </a>
            <Link to="/menu" className="btn btn-ink">
              Order something else <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
