import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Clock,
  Loader2,
  LogOut,
  Phone,
  Printer,
  RefreshCw,
  Truck,
} from "lucide-react";
import { cn, money } from "../lib/format";
import { SITE } from "../data/site";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type KitchenOrder = {
  session_id: string;
  order_id: string;
  created_at: number;
  updated_at: number | null;
  amount_total: number;
  currency: string;
  kitchen_status: "new" | "started" | "completed" | string;
  fulfillment: string;
  customer_name: string;
  phone: string;
  email: string;
  requested_for: string;
  notes: string;
  address: string;
  items: { name: string; qty: number; amount: number }[];
};

type Phase = "checking" | "unconfigured" | "login" | "ready" | "error";
type Filter = "active" | "new" | "started" | "completed" | "cancelled";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  started: "Cooking",
  completed: "Done",
  cancelled: "Cancelled",
};

const relative = (timestamp: number) => {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hr ago" : `${hours} hr ago`;
};

const clockTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

export function Kitchen() {
  useDocumentTitle("Kitchen — Daqs & Oxtails");
  // Staff-only screen: keep it out of search results and link previews.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filter, setFilter] = useState<Filter>("active");
  const announced = useRef(0);
  const [announcement, setAnnouncement] = useState("");

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch("/api/kitchen/orders?limit=60");
      if (response.status === 401) {
        setPhase("login");
        return;
      }
      if (!response.ok) throw new Error("Could not load orders");
      const payload = (await response.json()) as { orders: KitchenOrder[]; fetchedAt: number };
      setOrders(payload.orders ?? []);
      setFetchedAt(payload.fetchedAt ?? Date.now());
      setPhase("ready");

      const fresh = (payload.orders ?? []).filter((order) => order.kitchen_status === "new").length;
      if (announced.current > 0 && fresh > announced.current) {
        setAnnouncement(`${fresh - announced.current} new order${fresh - announced.current === 1 ? "" : "s"} arrived.`);
      }
      announced.current = fresh;
    } catch {
      setPhase("error");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/kitchen/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { configured?: boolean; authenticated?: boolean } | null) => {
        if (!active) return;
        if (!data?.configured) {
          setPhase("unconfigured");
          return;
        }
        if (data.authenticated) {
          void loadOrders();
        } else {
          setPhase("login");
        }
      })
      .catch(() => {
        if (active) setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [loadOrders]);

  useEffect(() => {
    if (phase !== "ready") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOrders();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [phase, loadOrders]);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/kitchen/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.status === 429) {
        setLoginError("Too many attempts. Wait a few minutes and try again.");
        return;
      }
      if (!response.ok) {
        setLoginError("That password didn't match.");
        return;
      }
      setPassword("");
      await loadOrders();
    } catch {
      setLoginError("We couldn't reach the kitchen server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (sessionId: string, status: "new" | "started" | "completed") => {
    setBusy(sessionId);
    setActionError("");
    const previous = orders;
    setOrders((current) =>
      current.map((order) =>
        order.session_id === sessionId
          ? { ...order, kitchen_status: status, updated_at: Date.now() }
          : order,
      ),
    );
    try {
      const response = await fetch("/api/kitchen/orders/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, status }),
      });
      if (!response.ok) {
        setOrders(previous);
        setActionError("That change didn't save. Refresh and try again.");
      }
    } catch {
      setOrders(previous);
      setActionError("That change didn't save. Check the connection.");
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    await fetch("/api/kitchen/logout", { method: "POST" }).catch(() => null);
    setOrders([]);
    setPhase("login");
  };

  const counts = useMemo(() => {
    const base = { new: 0, started: 0, completed: 0, cancelled: 0 };
    for (const order of orders) {
      if (order.kitchen_status in base) {
        base[order.kitchen_status as keyof typeof base] += 1;
      }
    }
    return base;
  }, [orders]);

  const visible = useMemo(() => {
    if (filter === "active") {
      return orders.filter(
        (order) => order.kitchen_status !== "completed" && order.kitchen_status !== "cancelled",
      );
    }
    return orders.filter((order) => order.kitchen_status === filter);
  }, [orders, filter]);

  if (phase === "checking") {
    return (
      <section className="shell py-20">
        <div className="mx-auto max-w-md text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto size-7 animate-spin text-royal" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Opening the kitchen screen…</h1>
        </div>
      </section>
    );
  }

  if (phase === "unconfigured") {
    return (
      <section className="shell py-20">
        <div className="mx-auto max-w-lg rounded-[1.5rem] border border-ink/10 bg-paper p-7">
          <span className="grid size-12 place-items-center rounded-full bg-cream-2 text-royal">
            <ChefHat className="size-6" strokeWidth={1.7} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">The kitchen screen isn't set up yet.</h1>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">
            Add a <code className="rounded bg-cream px-1 py-0.5 text-[0.82rem]">KITCHEN_PASSWORD</code>{" "}
            secret for this site, then reload. Staff sign in here to see paid orders and mark
            them started or completed.
          </p>
          <p className="mt-3 text-[0.82rem] leading-relaxed text-muted">
            Until then, the kitchen is alerted by email or text for every paid order.
          </p>
        </div>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="shell py-20">
        <div className="mx-auto max-w-lg rounded-[1.5rem] border border-ink/10 bg-paper p-7 text-center">
          <h1 className="font-display text-2xl font-semibold">We couldn't load the orders.</h1>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">
            Check the connection and try again. Paid orders are still being recorded.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-ink mt-5">
            <RefreshCw className="size-4" /> Reload
          </button>
        </div>
      </section>
    );
  }

  if (phase === "login") {
    return (
      <section className="shell py-16 sm:py-24">
        <div className="mx-auto max-w-sm rounded-[1.5rem] border border-ink/10 bg-paper p-7">
          <span className="grid size-12 place-items-center rounded-full bg-cream-2 text-royal">
            <ChefHat className="size-6" strokeWidth={1.7} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Kitchen sign-in</h1>
          <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">
            Staff only. This screen lists paid orders and lets you mark them started or
            completed.
          </p>

          <form onSubmit={login} className="mt-5">
            <label className="label" htmlFor="kitchen-password">
              Kitchen password
            </label>
            <input
              id="kitchen-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={cn("field", loginError && "border-clay")}
              autoComplete="current-password"
              aria-invalid={Boolean(loginError)}
              aria-describedby={loginError ? "kitchen-error" : undefined}
              required
            />
            {loginError ? (
              <p id="kitchen-error" role="alert" className="mt-2 text-[0.78rem] font-medium text-clay">
                {loginError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || password.length === 0}
              className="btn btn-gold mt-4 w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Checking…" : "Open the board"}
              <ArrowRight className="size-4" />
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="shell py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-royal">Kitchen</p>
          <h1 className="mt-1 font-display text-[clamp(1.9rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em]">
            Today's paid orders
          </h1>
          <p className="mt-1 text-[0.82rem] text-muted" role="status" aria-live="polite">
            {counts.new} new · {counts.started} cooking · {counts.completed} done
            {fetchedAt ? ` · updated ${relative(fetchedAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={loadingOrders}
            className="btn btn-outline"
          >
            <RefreshCw className={cn("size-4", loadingOrders && "animate-spin")} />
            Refresh
          </button>
          <button type="button" onClick={() => void logout()} className="btn btn-outline">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter orders">
        {(
          [
            ["active", `Active (${counts.new + counts.started})`],
            ["new", `New (${counts.new})`],
            ["started", `Cooking (${counts.started})`],
            ["completed", `Done (${counts.completed})`],
            ["cancelled", `Cancelled (${counts.cancelled})`],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "min-h-11 rounded-full px-4 text-[0.78rem] font-semibold transition",
              filter === value
                ? "bg-ink text-cream"
                : "border border-ink/12 text-ink hover:border-ink/30",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError ? (
        <p role="alert" className="mt-4 rounded-xl border border-clay/40 bg-clay/5 px-4 py-3 text-[0.82rem] text-ink">
          {actionError}
        </p>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-ink/15 bg-paper p-10 text-center">
          <Clock className="mx-auto size-6 text-muted" strokeWidth={1.6} />
          <p className="mt-3 font-display text-lg font-semibold">
            {filter === "completed" ? "Nothing completed yet today." : "No orders waiting."}
          </p>
          <p className="mt-1 text-[0.86rem] text-muted">
            New paid orders appear here on their own, about every 15 seconds.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {visible.map((order) => {
            const created = Number(order.created_at) || Date.now();
            const isBusy = busy === order.session_id;
            return (
              <li
                key={order.session_id}
                className={cn(
                  "rounded-[1.25rem] border bg-paper p-5",
                  order.kitchen_status === "new" ? "border-royal/40" : "border-ink/10",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xl font-semibold leading-none">
                      {order.order_id}
                    </p>
                    <p className="mt-1 text-[0.76rem] text-muted">
                      {clockTime(created)} · {relative(created)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.12em]",
                      order.kitchen_status === "new" && "bg-royal text-cream",
                      order.kitchen_status === "started" && "bg-gold text-ink",
                      order.kitchen_status === "completed" && "bg-cream-2 text-muted",
                      order.kitchen_status === "cancelled" && "bg-clay text-cream",
                    )}
                  >
                    {STATUS_LABEL[order.kitchen_status] ?? order.kitchen_status}
                  </span>
                </div>

                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.84rem] text-muted">
                  {order.fulfillment === "delivery" ? (
                    <Truck className="size-3.5" strokeWidth={1.8} />
                  ) : (
                    <ChefHat className="size-3.5" strokeWidth={1.8} />
                  )}
                  <span className="font-semibold text-ink">
                    {order.fulfillment === "delivery" ? "Delivery" : "Pickup"}
                  </span>
                  <span>· for {order.requested_for || "ASAP"}</span>
                  <span>· {money((Number(order.amount_total) || 0) / 100)} paid</span>
                </p>

                <p className="mt-2 text-[0.84rem]">
                  <span className="font-semibold">{order.customer_name || "Customer"}</span>
                  {order.phone ? (
                    <a
                      href={`tel:${String(order.phone).replace(/[^\d+]/g, "")}`}
                      className="ml-2 inline-flex items-center gap-1 text-royal underline underline-offset-2"
                    >
                      <Phone className="size-3" /> {order.phone}
                    </a>
                  ) : null}
                </p>

                {order.address ? (
                  <p className="mt-1 text-[0.8rem] text-muted">{order.address}</p>
                ) : null}

                <ul className="mt-3 space-y-1 border-t border-ink/8 pt-3 text-[0.84rem]">
                  {order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <li key={`${order.session_id}-${index}`} className="flex justify-between gap-3">
                        <span>
                          <span className="font-semibold">{item.qty}×</span> {item.name}
                        </span>
                        <span className="text-muted">{money((item.amount || 0) / 100)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted">Line items are on the Stripe receipt.</li>
                  )}
                </ul>

                {order.notes ? (
                  <p className="mt-3 rounded-lg bg-cream px-3 py-2 text-[0.8rem] leading-relaxed">
                    <span className="font-semibold">Notes:</span> {order.notes}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/kitchen/ticket/${order.session_id}`}
                    className="btn btn-outline"
                  >
                    <Printer className="size-4" /> Print ticket
                  </Link>
                  {order.kitchen_status === "cancelled" ? (
                    <p className="flex-1 text-[0.8rem] font-semibold text-clay">
                      Refunded and cancelled by the customer — do not prepare.
                    </p>
                  ) : null}
                </div>

                {order.kitchen_status !== "cancelled" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {order.kitchen_status !== "started" && order.kitchen_status !== "completed" ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void setStatus(order.session_id, "started")}
                      className="btn btn-ink flex-1 disabled:opacity-60"
                    >
                      Start cooking
                    </button>
                  ) : null}
                  {order.kitchen_status !== "completed" ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void setStatus(order.session_id, "completed")}
                      className="btn btn-gold flex-1 disabled:opacity-60"
                    >
                      <CheckCircle2 className="size-4" /> Mark complete
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void setStatus(order.session_id, "new")}
                      className="btn btn-outline flex-1 disabled:opacity-60"
                    >
                      Reopen
                    </button>
                  )}
                </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-[0.74rem] leading-relaxed text-muted">
        Orders are paid online, so no card handling happens here. Questions about a
        ticket? Call the restaurant at {SITE.phone}.
      </p>
    </section>
  );
}
