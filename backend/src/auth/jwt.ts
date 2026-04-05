import jwt from "jsonwebtoken";
import type { AuthedUser, Role } from "../types.js";

const allowedRoles = new Set<Role>(["Admin", "Doctor", "Patient"]);

export interface JwtPayload {
  sub: string;
  email?: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function signToken(user: AuthedUser, secret: string, expiresIn = "8h"): string {
  return jwt.sign(
    { sub: user.sub, email: user.email, role: user.role },
    secret,
    { expiresIn } as jwt.SignOptions
  );
}

export function verifyToken(token: string, secret: string): AuthedUser {
  const payload = jwt.verify(token, secret) as JwtPayload;
  const sub = payload.sub ?? "";
  if (!sub) throw new Error("Missing sub");
  const rawRole = typeof payload.role === "string" ? payload.role : "Patient";
  const role: Role = allowedRoles.has(rawRole as Role) ? (rawRole as Role) : "Patient";
  return { sub, email: payload.email, role };
}
