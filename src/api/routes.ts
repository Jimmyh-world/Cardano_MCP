import { Express } from "express";

export const setupRoutes = (app: Express): void => {
  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API version prefix
  const apiRouter = app.router;
  const v1Router = app.router;

  // Tool endpoints
  v1Router.get("/tools", (_req, res) => {
    res.json({ message: "Tools endpoint" });
  });

  // Knowledge base endpoints
  v1Router.get("/knowledge", (_req, res) => {
    res.json({ message: "Knowledge base endpoint" });
  });

  // Mount v1 router
  apiRouter.use("/v1", v1Router);

  // Mount API router
  app.use("/api", apiRouter);
};
