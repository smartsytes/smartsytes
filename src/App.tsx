import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { CartDrawer } from "./components/CartDrawer";
import { Layout } from "./components/Layout";
import { MobileCartBar } from "./components/MobileCartBar";
import { ScrollManager } from "./components/ScrollManager";
import { Toast } from "./components/Toast";
import { About } from "./pages/About";
import { Catering } from "./pages/Catering";
import { Checkout } from "./pages/Checkout";
import { CheckoutSuccess } from "./pages/CheckoutSuccess";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { OrderManage } from "./pages/OrderManage";
import { MenuPage } from "./pages/MenuPage";
import { Unavailable } from "./pages/Unavailable";
import { Visit } from "./pages/Visit";
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

/** Staff screens exist only where /api/* does (the Worker, not a static host). */
function RequiresApi({ children }: { children: React.ReactNode }) {
  const serving = useServing();
  return serving === "static" ? (
    <Unavailable
      title="This screen isn't available on this site."
      detail="The kitchen board needs the ordering service, which this copy doesn't include. Staff should use the hosted version."
    />
  ) : (
    <>{children}</>
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
