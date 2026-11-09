import { lazy, Suspense, useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { CartDrawer } from "./components/CartDrawer";
import { Layout } from "./components/Layout";
import { MobileCartBar } from "./components/MobileCartBar";
import { Toast } from "./components/Toast";
import { About } from "./pages/About";
import { Catering } from "./pages/Catering";
import { Checkout } from "./pages/Checkout";
import { CheckoutSuccess } from "./pages/CheckoutSuccess";
import { Home } from "./pages/Home";
import { OrderManage } from "./pages/OrderManage";
import { MenuPage } from "./pages/MenuPage";
import { Visit } from "./pages/Visit";
import { useDocumentTitle } from "./lib/useDocumentTitle";
import { useServing } from "./lib/serving";

// Staff-only screens. Loading them on demand keeps the kitchen board and the
// printable ticket — and the QR encoder the ticket pulls in — out of the bundle
// every customer downloads.
const Kitchen = lazy(() => import("./pages/Kitchen").then((module) => ({ default: module.Kitchen })));
const KitchenTicket = lazy(() =>
  import("./pages/KitchenTicket").then((module) => ({ default: module.KitchenTicket })),
);

function RouteFallback() {
  return (
    <section className="shell py-24">
      <div className="mx-auto max-w-md text-center" role="status" aria-live="polite">
        <Loader2 className="mx-auto size-7 animate-spin text-royal" />
        <p className="mt-3 text-[0.9rem] text-muted">Loading…</p>
      </div>
    </section>
  );
}

function StaticCopyNotice() {
  useDocumentTitle("Not available here — Daqs & Oxtails");

  return (
    <section className="shell py-24">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-[clamp(1.9rem,4.4vw,2.6rem)] font-semibold leading-tight">
          This screen isn&apos;t on this copy of the site.
        </h1>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
          The kitchen board needs the ordering service, and this copy is served
          as plain files. Staff should use the hosted version.
        </p>
        <Link to="/" className="btn btn-ink mt-6">
          Back home <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/** Staff screens exist only where /api/* does (the Worker, not a static host). */
function RequiresApi({ children }: { children: React.ReactNode }) {
  const serving = useServing();
  return serving === "static" ? <StaticCopyNotice /> : <>{children}</>;
}

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

function NotFound() {
  useDocumentTitle("Page not found — Daqs & Oxtails");

  return (
    <section className="grain relative overflow-hidden bg-ink py-24 text-cream sm:py-32">
      <div className="pointer-events-none absolute -right-24 top-0 size-[26rem] rounded-full bg-royal/35 blur-[110px]" />
      <div className="shell relative z-10 max-w-xl">
        <span className="eyebrow flex items-center gap-2 text-gold">
          <span className="h-px w-6 bg-gold/60" /> 404
        </span>
        <h1 className="mt-3 font-display text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
          That plate isn&apos;t on the menu.
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-cream/65">
          The page you were looking for has moved or never existed. The good
          stuff — oxtails, gumbo and daqs — is still right this way.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/menu" className="btn btn-gold">
            See the menu <ArrowRight className="size-4" />
          </Link>
          <Link to="/" className="btn btn-outline-light">
            Back home
          </Link>
        </div>
      </div>
    </section>
  );
}

export function App() {
  return (
    <>
      <ScrollManager />
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/catering" element={<Catering />} />
            <Route path="/about" element={<About />} />
            <Route path="/visit" element={<Visit />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/order/:sessionId" element={<OrderManage />} />
            <Route
              path="/kitchen"
              element={
                <RequiresApi>
                  <Kitchen />
                </RequiresApi>
              }
            />
            <Route
              path="/kitchen/ticket/:sessionId"
              element={
                <RequiresApi>
                  <KitchenTicket />
                </RequiresApi>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
      <CartDrawer />
      <MobileCartBar />
      <Toast />
    </>
  );
}
