import path from "node:path";

import { AppError } from "./errors.js";

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "not_found", message: "Route not found" });
}

export function errorHandler(err, _req, res, _next) {
  const status = err instanceof AppError ? err.statusCode : 500;

  // Avoid leaking stack traces in production.
  const isProd = process.env.NODE_ENV === "production";
  const payload = {
    error: status === 500 ? "server_error" : "request_error",
    message: err?.message ?? "Server error",
    ...(err instanceof AppError && err.details ? { details: err.details } : null),
    ...(isProd ? null : { stack: err?.stack })
  };

  res.status(status).json(payload);
}

