import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken({ userId, role, email }) {
  return jwt.sign(
    { userId, role, email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

