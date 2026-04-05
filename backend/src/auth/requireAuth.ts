import type { ApiEvent, AuthedUser, Role } from "../types.js";
import { forbidden, unauthorized } from "../http.js";
import { loadConfig } from "../config.js";
import { verifyToken } from "./jwt.js";
import type { ApiResponse } from "../types.js";

function getSecret(): string {
  return loadConfig().JWT_SECRET;
}

function getBearer(headers?: Record<string, string | undefined>): string | null {
  const h = headers ?? {};
  const auth = h.authorization ?? h.Authorization ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function requireAuth(event: ApiEvent): Promise<{ user: AuthedUser } | { response: ReturnType<typeof unauthorized> }> {
  const token = getBearer(event.headers);
  if (!token) return { response: unauthorized("Missing Bearer token") };
  try {
    const user = verifyToken(token, getSecret());
    return { user };
  } catch {
    return { response: unauthorized("Invalid or expired token") };
  }
}

export function requireRole(user: AuthedUser, allowed: Role[]): ApiResponse | null {
  if (!allowed.includes(user.role)) return forbidden("Insufficient role");
  return null;
}
