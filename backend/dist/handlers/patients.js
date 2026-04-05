import { badRequest, notFound, ok } from "../http.js";
import { requireAuth, requireRole } from "../auth/requireAuth.js";
import { PatientCreateSchema, createPatient, getPatientById, listPatientsForDoctor } from "../db/patients.js";
function parseJsonBody(event) {
    if (!event.body)
        return null;
    try {
        return JSON.parse(event.body);
    }
    catch {
        return null;
    }
}
export async function handler(event) {
    const authed = await requireAuth(event);
    if ("response" in authed)
        return authed.response;
    if (event.httpMethod === "GET" && event.path === "/patients") {
        // Doctors see their assigned patients. (Admin listing can be added later.)
        const denied = requireRole(authed.user, ["Doctor"]);
        if (denied)
            return denied;
        const patients = await listPatientsForDoctor(authed.user.sub);
        return ok({ patients });
    }
    if (event.httpMethod === "POST" && event.path === "/patients") {
        const denied = requireRole(authed.user, ["Doctor"]);
        if (denied)
            return denied;
        const body = parseJsonBody(event);
        const parsed = PatientCreateSchema.safeParse(body);
        if (!parsed.success)
            return badRequest("Invalid body", parsed.error.flatten());
        const created = await createPatient(parsed.data, authed.user.sub);
        return ok(created);
    }
    if (event.httpMethod === "GET" && event.path.startsWith("/patients/")) {
        const idStr = event.path.split("/")[2] ?? "";
        const id = Number(idStr);
        if (!Number.isFinite(id) || id <= 0)
            return badRequest("Invalid patient id");
        const patient = await getPatientById(id);
        if (!patient)
            return notFound("Patient not found");
        // Access model (simple, can be expanded):
        // - Doctor can access if doctor_id matches
        // - Admin can access any
        // - Patient access can be added by linking patient to user_id
        if (authed.user.role === "Doctor") {
            const p = patient;
            if (p.doctor_id !== authed.user.sub)
                return notFound("Patient not found");
        }
        if (authed.user.role !== "Doctor" && authed.user.role !== "Admin")
            return notFound("Patient not found");
        return ok({ patient });
    }
    return notFound();
}
