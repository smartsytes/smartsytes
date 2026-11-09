import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ScrollManager } from "./components/ScrollManager";
import { About } from "./pages/About";
import { Catering } from "./pages/Catering";
import { Home } from "./pages/Home";
import { MenuPage } from "./pages/MenuPage";
import { NotFound } from "./pages/NotFound";
import { Unavailable } from "./pages/Unavailable";
import { Visit } from "./pages/Visit";
import { SITE } from "./data/site";

/**
 * The cPanel/Apache build: the same marketing site, minus every ordering screen.
 *
 * The routes below are kept so an old link or a search result lands somewhere
 * that explains itself, but nothing behind them is bundled — no checkout, no
 * cart, no kitchen board, no ticket printer, no QR encoder.
 */
export function AppStatic() {
  return (
    <>
      <ScrollManager />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/catering" element={<Catering />} />
          <Route path="/about" element={<About />} />
          <Route path="/visit" element={<Visit />} />
          <Route
            path="/checkout"
            element={
              <Unavailable
                title="Online ordering isn't available on this copy of the site."
                detail={`This copy is served as plain files, so there is no checkout. Call ${SITE.phone} and we'll take your order for pickup or delivery.`}
              />
            }
          />
          <Route
            path="/checkout/success"
            element={
              <Unavailable
                title="Online ordering isn't available on this copy of the site."
                detail={`This copy is served as plain files, so there are no online receipts. Call ${SITE.phone} with any questions about an order.`}
              />
            }
          />
          <Route
            path="/order/:sessionId"
            element={
              <Unavailable
                title="Order changes aren't available on this copy of the site."
                detail={`This copy is served as plain files and can't change an online order. Call ${SITE.phone} and we'll sort it out.`}
              />
            }
          />
          <Route
            path="/kitchen"
            element={
              <Unavailable
                title="This screen isn't on this copy of the site."
                detail="The kitchen board needs the ordering service, and this copy is served as plain files. Staff should use the hosted version."
              />
            }
          />
          <Route
            path="/kitchen/ticket/:sessionId"
            element={
              <Unavailable
                title="This screen isn't on this copy of the site."
                detail="Ticket printing needs the ordering service, and this copy is served as plain files. Staff should use the hosted version."
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </>
  );
}
