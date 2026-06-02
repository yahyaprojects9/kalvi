import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import contentRoutes from "./routes/content.routes.js";
import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import adminRoutes from "./routes/admin.routes.js";

export function createServer() {
  const app = express();

  app.use(cors({
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json());

  app.use("/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api", contentRoutes);

  app.use((err, _req, res, _next) => {
    console.error("API error", {
      code: err?.code,
      status: err?.status,
      message: err?.message,
      details: err?.details,
    });
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err && "message" in err
          ? String(err.message)
          : "Unknown error";

    const tablesMissing = err?.code === "42P01" || err?.code === "PGRST205";
    const status = err?.status ?? (tablesMissing ? 503 : 500);
    const safeMessage = tablesMissing
      ? "Database tables are not ready. Run npm run db:migrate, then npm run db:seed."
      : message;

    res.status(status).json({
      success: false,
      error: status >= 500 && !tablesMissing ? "Internal server error" : safeMessage,
      message: safeMessage,
    });
  });

  return app;
}
