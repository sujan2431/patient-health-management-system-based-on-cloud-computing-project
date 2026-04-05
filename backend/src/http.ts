import type { ApiResponse } from "./types.js";

const defaultHeaders: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export function json(statusCode: number, data: unknown, extraHeaders?: Record<string, string>): ApiResponse {
  return {
    statusCode,
    headers: { ...defaultHeaders, ...(extraHeaders ?? {}) },
    body: JSON.stringify(data)
  };
}

export function ok(data: unknown): ApiResponse {
  return json(200, data);
}

export function badRequest(message: string, details?: unknown): ApiResponse {
  return json(400, { error: "bad_request", message, details });
}

export function unauthorized(message = "Unauthorized"): ApiResponse {
  return json(401, { error: "unauthorized", message });
}

export function forbidden(message = "Forbidden"): ApiResponse {
  return json(403, { error: "forbidden", message });
}

export function notFound(message = "Not found"): ApiResponse {
  return json(404, { error: "not_found", message });
}

export function serverError(message = "Server error"): ApiResponse {
  return json(500, { error: "server_error", message });
}

