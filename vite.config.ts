import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import worker from "./deploy-worker.js";
import { menu } from "./src/data/menu";
import { SITE } from "./src/data/site";

// The Worker prices every order from this catalog, which is generated from the
// same data the site renders. Prices therefore only ever change in one place.
const catalog = {
  currency: "usd",
  taxRate: SITE.taxRate,
  deliveryFeeCents: Math.round(SITE.deliveryFee * 100),
  items: menu.map((item) => ({
    id: item.id,
    name: item.name,
    priceCents: Math.round(item.price * 100),
    addons: (item.addons ?? []).map((addon) => ({
      id: addon.id,
      label: addon.label,
      priceCents: Math.round(addon.price * 100),
    })),
  })),
};

type Row = Record<string, unknown>;
type QueryResult = { meta: { changes: number }; results?: Row[] };

/**
 * Just enough of D1 to run the kitchen screen locally. Dev only — production
 * uses the real `DB` binding.
 */
class DevOrdersDB {
  private rows = new Map<string, Row>();

  prepare(query: string) {
    const sql = query.replace(/\s+/g, " ").trim();
    const db = this;

    const execute = async (args: unknown[]): Promise<QueryResult> => {
      if (sql.startsWith("CREATE TABLE") || sql.startsWith("ALTER TABLE")) {
        return { meta: { changes: 0 } };
      }

      if (sql.startsWith("INSERT INTO orders")) {
        const sessionId = String(args[0]);
        if (db.rows.has(sessionId)) return { meta: { changes: 0 } };
        db.rows.set(sessionId, {
          session_id: sessionId,
          order_id: args[1],
          created_at: args[2],
          amount_total: args[3],
          currency: args[4],
          status: args[5],
          fulfillment: args[6],
          customer_name: args[7],
          phone: args[8],
          email: args[9],
          requested_for: args[10],
          notes: args[11],
          address: args[12],
          items: args[13],
          notified: args[14],
          kitchen_status: "new",
          updated_at: args[2],
        });
        return { meta: { changes: 1 } };
      }

      if (sql.startsWith("UPDATE orders SET kitchen_status")) {
        const [status, updatedAt, sessionId] = args;
        const row = db.rows.get(String(sessionId));
        if (!row) return { meta: { changes: 0 } };
        db.rows.set(String(sessionId), { ...row, kitchen_status: status, updated_at: updatedAt });
        return { meta: { changes: 1 } };
      }

      if (sql.startsWith("UPDATE orders SET notified")) {
        const [notified, customerNotified, sessionId] = args;
        const row = db.rows.get(String(sessionId));
        if (!row) return { meta: { changes: 0 } };
        db.rows.set(String(sessionId), { ...row, notified, customer_notified: customerNotified });
        return { meta: { changes: 1 } };
      }

      if (sql.startsWith("SELECT") && sql.includes("WHERE session_id = ?")) {
        const row = db.rows.get(String(args[0]));
        return { meta: { changes: 0 }, results: row ? [row] : [] };
      }

      if (sql.startsWith("SELECT") && sql.includes("FROM orders")) {
        const limit = Number(args[0]) || 50;
        const results = [...db.rows.values()]
          .sort((a, b) => Number(b.created_at) - Number(a.created_at))
          .slice(0, limit);
        return { meta: { changes: 0 }, results };
      }

      return { meta: { changes: 0 } };
    };

    const bound = (args: unknown[]) => ({
      run: () => execute(args),
      all: () => execute(args),
      first: async () => (await execute(args)).results?.[0] ?? null,
    });

    return {
      bind: (...args: unknown[]) => bound(args),
      run: () => execute([]),
      all: () => execute([]),
      first: async () => (await execute([])).results?.[0] ?? null,
    };
  }
}

/**
 * Emits `/catalog.json` into the build and runs the same Worker API on the dev
 * server, so checkout and the kitchen board behave identically before and
 * after a deploy.
 */
function catalogAndApi(
  secretKey: string,
  kitchenPassword: string,
  webhookSecret: string,
): Plugin {
  const db = new DevOrdersDB();

  return {
    name: "daqs-catalog-and-api",

    configureServer(server) {
      server.middlewares.use("/catalog.json", (_request, response) => {
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify(catalog));
      });

      server.middlewares.use((request, response, next) => {
        const path = request.url ?? "";
        if (!path.startsWith("/api/")) return next();

        void (async () => {
          // Behind the preview proxy the browser is on https while this server
          // speaks http, so trust the forwarded protocol and the Origin header
          // the browser actually sent.
          const forwardedProto = request.headers["x-forwarded-proto"];
          const protocol =
            typeof forwardedProto === "string" ? forwardedProto.split(",")[0].trim() : "http";
          const host = request.headers.host ?? "localhost:3003";
          const originHeader = request.headers.origin;
          const origin =
            typeof originHeader === "string" && originHeader ? originHeader : `${protocol}://${host}`;
          const chunks: Buffer[] = [];
          for await (const chunk of request) chunks.push(chunk as Buffer);
          const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
          const hasBody = request.method !== "GET" && request.method !== "HEAD";

          const workerResponse = await worker.fetch(
            new Request(new URL(path, origin), {
              method: request.method,
              headers: Object.entries(request.headers).flatMap(([key, value]) =>
                typeof value === "string" ? [[key, value] as [string, string]] : [],
              ),
              body: hasBody ? body : undefined,
            }),
            {
              APP_ORIGIN: origin,
              STRIPE_SECRET_KEY: secretKey,
              STRIPE_WEBHOOK_SECRET: webhookSecret,
              KITCHEN_PASSWORD: kitchenPassword,
              DB: db,
              ASSETS: {
                fetch: async () =>
                  new Response(JSON.stringify(catalog), {
                    headers: { "content-type": "application/json" },
                  }),
              },
            },
          );

          response.statusCode = workerResponse.status;
          workerResponse.headers.forEach((value, key) => response.setHeader(key, value));
          response.end(Buffer.from(await workerResponse.arrayBuffer()));
        })().catch(next);
      });
    },

    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "catalog.json",
        source: JSON.stringify(catalog, null, 2),
      });
    },
  };
}

// Preview hosts are supplied per-session through
// __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS by the cloud preview runtime.
export default defineConfig(({ mode }) => {
  // Inline env vars (KITCHEN_PASSWORD=… npm run dev) win over .env, which is
  // how the board gets a throwaway password during local testing.
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };

  return {
    plugins: [
      react(),
      tailwindcss(),
      catalogAndApi(
        env.STRIPE_SECRET_KEY ?? "",
        env.KITCHEN_PASSWORD ?? "kitchen",
        env.STRIPE_WEBHOOK_SECRET ?? "",
      ),
    ],
    server: {
      host: "0.0.0.0",
      port: 3003,
      strictPort: true,
    },
  };
});
