import { z } from "zod";
import type { ApiEvent, ApiResponse } from "../types.js";
import { badRequest, notFound, ok } from "../http.js";
import { requireAuth, requireRole } from "../auth/requireAuth.js";
import { getPatientById } from "../db/patients.js";
import { getPool } from "../db/pool.js";

const LinkSchema = z.object({
  patient_id: z.number().int().positive(),
  patient_user_id: z.string().min(1)
});

function parseJsonBody(event: ApiEvent): unknown {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const authed = await requireAuth(event);
  if ("response" in authed) return authed.response;

  if (event.httpMethod !== "POST" || event.path !== "/patients/link-user") return notFound();

  const denied = requireRole(authed.user, ["Admin", "Doctor"]);
  if (denied) return denied;

  const body = parseJsonBody(event);
  const parsed = LinkSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const patient = await getPatientById(parsed.data.patient_id);
  if (!patient) return notFound("Patient not found");

  if (authed.user.role === "Doctor") {
    const p = patient as { doctor_id?: string };
    if (p.doctor_id !== authed.user.sub) return notFound("Patient not found");
  }

  await getPool().run(
    "UPDATE Patients SET patient_user_id = :patient_user_id WHERE patient_id = :patient_id",
    { ":patient_user_id": parsed.data.patient_user_id, ":patient_id": parsed.data.patient_id }
  );

  return ok({ linked: true });
}

