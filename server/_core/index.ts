import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { generateBlogPost } from "../blog-writer";
import { syncHostawayListings } from "../hostaway-sync";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // ── Heartbeat endpoints for scheduled jobs ──────────────────────────────
  // Called by the Manus scheduler; protected by a shared secret.
  const HEARTBEAT_SECRET = process.env.HEARTBEAT_SECRET || "rose-city-heartbeat";

  app.post("/api/heartbeat/blog-writer", async (req, res) => {
    const auth = (req.headers["x-heartbeat-secret"] as string) || (req.query.secret as string);
    if (auth !== HEARTBEAT_SECRET) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await generateBlogPost(req.body?.topic);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/heartbeat/hostaway-sync", async (req, res) => {
    const auth = (req.headers["x-heartbeat-secret"] as string) || (req.query.secret as string);
    if (auth !== HEARTBEAT_SECRET) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await syncHostawayListings();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
