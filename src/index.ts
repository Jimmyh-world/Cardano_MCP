import express from "express";
import dotenv from "dotenv";
import { setupRoutes } from "./api/routes";
import { initializeToolRegistry } from "./tools/registry";
import { initializeKnowledgeBase } from "./knowledge/connector";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize components
initializeToolRegistry();
initializeKnowledgeBase();

// Setup routes
setupRoutes(app);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  },
);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
