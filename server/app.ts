import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { ENV } from "./_core/env";

/**
 * Creates the QRIA HTTP application without binding to a port.
 * This can be used by a long-running Node process, a serverless function,
 * tests, or any host capable of running an Express-compatible handler.
 */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Legacy services are registered only when the legacy Manus runtime is selected.
  if (ENV.authMode === "manus") {
    registerOAuthRoutes(app);
    registerStorageProxy(app);
  }

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      app: "qria",
      authMode: ENV.authMode,
      aiProvider: ENV.aiProvider,
      imageProvider: ENV.imageProvider,
    });
  });

  return app;
}
