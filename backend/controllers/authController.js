import bcrypt from "bcrypt";
import { z } from "zod";

import { createUser, getUserByEmail } from "../models/userModel.js";
import { addAuditLog } from "../models/auditModel.js";
import { signToken } from "../services/tokenService.js";
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from "../middleware/errors.js";

const RegisterSchema = z.object({
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().email()
  ),
  password: z.string().min(8).max(128),
  role: z.enum(["Admin", "Doctor", "Patient"]),
  inviteCode: z.string().optional()
});

export async function register(req, res) {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid request body", parsed.error.flatten());

  const { email, password, role, inviteCode } = parsed.data;

  if ((role === "Admin" || role === "Doctor") && envInviteRequired(role) && inviteCode !== process.env.INVITE_CODE) {
    throw new ForbiddenError("Invite code required for privileged roles");
  }

  const existing = await getUserByEmail(email);
  if (existing) throw new BadRequestError("Email already registered");

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await createUser({ email: email.toLowerCase(), passwordHash, role });

  // eslint-disable-next-line no-console
  await addAuditLog({ userId, action: "register", metadata: { role } });

  return res.status(201).json({
    message: "Registered successfully",
    user: { id: userId, email: email.toLowerCase(), role }
  });
}

function envInviteRequired(_role) {
  return Boolean(process.env.INVITE_CODE);
}

export async function login(req, res) {
  const LoginSchema = z.object({
    email: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().email()
    ),
    password: z.preprocess(
      (v) => (typeof v === "string" ? v : v),
      z.string().min(1)
    )
  });

  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid request body", parsed.error.flatten());

  const { email, password } = parsed.data;
  const user = await getUserByEmail(email.toLowerCase());
  if (!user) throw new UnauthorizedError("Invalid credentials");

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new UnauthorizedError("Invalid credentials");

  await addAuditLog({ userId: user.id, action: "login" });

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role }
  });
}

