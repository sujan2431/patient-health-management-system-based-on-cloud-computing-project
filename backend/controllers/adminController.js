import { z } from "zod";

import { listUsers, updateUserRole, getUserById } from "../models/userModel.js";
import { listAuditLogs } from "../models/auditModel.js";
import { BadRequestError, NotFoundError } from "../middleware/errors.js";

export async function adminListUsers(_req, res) {
  const users = await listUsers();
  return res.json({ users });
}

export async function adminListAuditLogs(req, res) {
  const { user_id, action, from, to } = req.query;
  const parsed = {
    userId: user_id ? Number(user_id) : undefined,
    action: action ? String(action) : undefined,
    from: from ? String(from) : undefined,
    to: to ? String(to) : undefined
  };

  const logs = await listAuditLogs(parsed);
  return res.json({ logs });
}

export async function adminUpdateUserRole(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) throw new BadRequestError("Invalid user id");

  const Schema = z.object({
    role: z.enum(["Admin", "Doctor", "Patient"])
  });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid body", parsed.error.flatten());

  const user = await getUserById(id);
  if (!user) throw new NotFoundError("User not found");

  const changes = await updateUserRole(id, parsed.data.role);
  return res.json({ updated: changes > 0 });
}

