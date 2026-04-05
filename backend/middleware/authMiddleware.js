import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UnauthorizedError } from "./errors.js";

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) return next(new UnauthorizedError("Missing Authorization header"));

  const match = String(header).match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) return next(new UnauthorizedError("Invalid Authorization header"));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload; // { userId, role, email }
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
}

