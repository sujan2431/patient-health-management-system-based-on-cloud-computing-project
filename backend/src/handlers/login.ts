import type { ApiEvent, ApiResponse } from "../types.js";
import { ok, badRequest, unauthorized } from "../http.js";
import { loadConfig } from "../config.js";
import { signToken } from "../auth/jwt.js";
import type { AuthedUser, Role } from "../types.js";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Demo in-memory user store
// In production replace this with a real DB query.
// Passwords stored as bcrypt hashes (cost=10).
// To generate: node -e "const b=require('bcryptjs'); console.log(b.hashSync('yourpassword',10))"
// ---------------------------------------------------------------------------
interface LocalUser {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
}

// Default demo accounts (password = "Password1!")
// You can add/change these — hashes are bcrypt-generated from "Password1!"
const DEMO_USERS: LocalUser[] = [
  {
    id: "admin-001",
    email: "admin@hospital.com",
    passwordHash: "$2b$10$zp6TY0fYqhkNclr0H3mDHeK4fIr59RaHvUMemrEvK1RofKP//OR2y", // Password1!
    role: "Admin"
  },
  {
    id: "doctor-001",
    email: "doctor@hospital.com",
    passwordHash: "$2b$10$zp6TY0fYqhkNclr0H3mDHeK4fIr59RaHvUMemrEvK1RofKP//OR2y",
    role: "Doctor"
  },
  {
    id: "patient-001",
    email: "patient@hospital.com",
    passwordHash: "$2b$10$zp6TY0fYqhkNclr0H3mDHeK4fIr59RaHvUMemrEvK1RofKP//OR2y",
    role: "Patient"
  }
];

function findUser(email: string): LocalUser | undefined {
  return DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  if (event.httpMethod !== "POST") return badRequest("Method not allowed");

  let body: { email?: string; password?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { email, password } = body;
  if (!email || !password) return badRequest("email and password are required");

  const localUser = findUser(email);
  if (!localUser) return unauthorized("Invalid credentials");

  const match = await bcrypt.compare(password, localUser.passwordHash);
  if (!match) return unauthorized("Invalid credentials");

  const user: AuthedUser = { sub: localUser.id, email: localUser.email, role: localUser.role };
  const secret = loadConfig().JWT_SECRET;
  const token = signToken(user, secret);

  return ok({ token, user: { sub: user.sub, email: user.email, role: user.role } });
}
