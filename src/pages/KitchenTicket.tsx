import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { money } from "../lib/format";
import { SITE } from "../data/site";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type TicketOrder = {
  session_id: string;
  order_id: string;
  created_at: number;
  amount_total: number;
  currency: string;
  kitchen_status: string;
  fulfillment: string;
  customer_name: string;
  phone: string;
  requested_for: string;
  notes: string;
  address: string;
  items: { name: string; qty: number; amount: number }[];
};

type QrModule = { toDataURL: (text: string, options?: Record<string, unknown>) => Promise<string> };

const clock = (timestamp: number) =>
  new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

export function KitchenTicket() {
  useDocumentTitle("Kitchen ticket — Daqs & Oxtails");

  const { sessionId } = useParams();
  const [order, setOrder] = useState<TicketOrder | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "signed-out" | "missing">("loading");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setPhase("missing");
      return;
    }

    let active = true;
    fetch(`/api/kitchen/order?sessionId=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setPhase("signed-out");
          return null;
        }
        if (!response.ok) throw new Error("not found");
        return (await response.json()) as { order: TicketOrder };
      })
      .then((data) => {
        if (!active || !data) return;
        setOrder(data.order);
        setPhase("ready");
      })
      .catch(() => {
        if (active) setPhase("missing");
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  // The QR opens this ticket on a phone, so a ticket can leave the printer and
  // still be looked up without typing the order number.
  useEffect(() => {
    if (!order || typeof window === "undefined") return;

    let active = true;
    const target = `${window.location.origin}/kitchen/ticket/${order.session_id}`;

    void (async () => {
      try {
        const imported = (await import("qrcode")) as unknown as
          | ({ default?: QrModule } & Partial<QrModule>)
          | undefined;
        const renderer = imported?.default ?? imported;
        if (!renderer?.toDataURL) return;
        const data = await renderer.toDataURL(target, { margin: 1, width: 320, errorCorrectionLevel: "M" });
        if (active) setQr(data);
      } catch {
        /* a missing QR should never stop a ticket from printing */
      }
    })();

    return () => {
      active = false;
    };
  }, [order]);

  if (phase === "loading") {
    return (
      <section className="shell py-20">
        <div className="mx-auto max-w-md text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto size-7 animate-spin text-royal" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Printing the ticket…</h1>
        </div>
      </section>
    );
  }

  if (phase !== "ready" || !order) {
    return (
      <section className="shell py-20">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold">
            {phase === "signed-out" ? "Sign in to print tickets." : "We couldn't find that order."}
          </h1>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">
            {phase === "signed-out"
              ? "The ticket shows the customer's contact details, so it needs a kitchen session."
              : "The order number may be wrong, or the order is not in the database yet."}
          </p>
          <Link to="/kitchen" className="btn btn-ink mt-5">
            <ArrowLeft className="size-4" /> Back to the board
          </Link>
        </div>
      </section>
    );
  }

  const isDelivery = order.fulfillment === "delivery";

  return (
    <section className="shell py-8 print:py-0">
      <div className="mx-auto max-w-[44rem]">
        <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="btn btn-ink">
            <Printer className="size-4" /> Print ticket
          </button>
          <Link to="/kitchen" className="btn btn-outline">
            <ArrowLeft className="size-4" /> Back to the board
          </Link>
          <p className="text-[0.76rem] text-muted">
            Prints black on white — no site chrome, one page.
          </p>
        </div>

        <article className="ticket-sheet rounded-2xl border-2 border-ink bg-paper p-6 text-ink sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-4">
            <div>
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.24em] text-royal">
                {isDelivery ? "Delivery" : "Pickup"} · paid online
              </p>
              <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.2rem)] font-semibold leading-none tracking-[-0.02em]">
                {order.order_id}
              </h1>
              <p className="mt-2 text-[0.9rem] font-semibold">
                Ready for {order.requested_for || "ASAP"} · {money(order.amount_total / 100)}
              </p>
            </div>
            <div className="text-right">
              {qr ? (
                <img
                  src={qr}
                  alt={`QR code for order ${order.order_id}`}
                  width={112}
                  height={112}
                  className="ml-auto size-24 sm:size-28"
                />
              ) : null}
              <p className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                Scan to reopen
              </p>
            </div>
          </header>

          <div className="grid gap-4 border-b border-ink/20 py-4 sm:grid-cols-2">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Customer</p>
              <p className="mt-1 text-[1.05rem] font-semibold">{order.customer_name || "Customer"}</p>
              {order.phone ? (
                <p className="text-[0.95rem] tabular-nums">{order.phone}</p>
              ) : null}
              {isDelivery && order.address ? (
                <p className="mt-1 text-[0.85rem] leading-snug">{order.address}</p>
              ) : null}
            </div>
            <div className="sm:text-right">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Ticket</p>
              <p className="mt-1 text-[0.9rem]">Placed {clock(order.created_at)}</p>
              <p className="text-[0.9rem]">
                Status: {(order.kitchen_status ?? "new").toUpperCase()}
              </p>
            </div>
          </div>

          <table className="w-full border-collapse py-2 text-[1rem]">
            <caption className="sr-only">Items on order {order.order_id}</caption>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${order.session_id}-${index}`}>
                  <td className="w-10 py-1.5 align-top text-[1.15rem] font-bold tabular-nums">
                    {item.qty}×
                  </td>
                  <td className="py-1.5 align-top">{item.name}</td>
                  <td className="py-1.5 pl-3 text-right align-top tabular-nums">
                    {money((item.amount || 0) / 100)}
                  </td>
                </tr>
              ))}
              {order.items.length === 0 ? (
                <tr>
                  <td className="py-2 text-muted" colSpan={3}>
                    Line items are on the Stripe receipt.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {order.notes ? (
            <div className="mt-2 border-2 border-ink p-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                Kitchen notes
              </p>
              <p className="mt-1 text-[1.05rem] font-semibold leading-snug">{order.notes}</p>
            </div>
          ) : null}

          <footer className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t-2 border-ink pt-3">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                Total paid
              </p>
              <p className="text-[1.5rem] font-bold tabular-nums">
                {money(order.amount_total / 100)}
              </p>
            </div>
            <p className="text-right text-[0.72rem] leading-snug text-muted">
              {SITE.addressLine1}
              <br />
              {SITE.addressLine2} · {SITE.phone}
            </p>
          </footer>
        </article>

        <p className="mt-4 text-[0.72rem] leading-relaxed text-muted print:hidden">
          21+ with valid ID for daiquiris. Refunds and changes are handled through
          Stripe and the kitchen, not on this sheet.
        </p>
      </div>
    </section>
  );
}
