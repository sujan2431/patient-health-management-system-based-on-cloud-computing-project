import type { ApiEvent, ApiResponse } from "../types.js";
import { ok } from "../http.js";
import { requireAuth } from "../auth/requireAuth.js";

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const authed = await requireAuth(event);
  if ("response" in authed) return authed.response;
  return ok({ user: authed.user });
}

