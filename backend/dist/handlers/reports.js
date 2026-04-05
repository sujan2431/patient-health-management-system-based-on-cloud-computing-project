import { z } from "zod";
import { badRequest, notFound, ok } from "../http.js";
import { requireAuth, requireRole } from "../auth/requireAuth.js";
import { presignDownload, presignUpload } from "../s3/presign.js";
import { createReport, getReportById, listReportsForPatient } from "../db/reports.js";
import { getPatientById, getPatientByUserId } from "../db/patients.js";
const PresignSchema = z.object({
    patient_id: z.number().int().positive(),
    content_type: z.string().min(1),
    filename: z.string().min(1),
    diagnosis: z.string().optional().default(""),
    report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
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
function safeKeyPart(s) {
    return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
export async function handler(event) {
    const authed = await requireAuth(event);
    if ("response" in authed)
        return authed.response;
    if (event.httpMethod === "POST" && event.path === "/reports/presign-upload") {
        const denied = requireRole(authed.user, ["Doctor"]);
        if (denied)
            return denied;
        const body = parseJsonBody(event);
        const parsed = PresignSchema.safeParse(body);
        if (!parsed.success)
            return badRequest("Invalid body", parsed.error.flatten());
        const patient = await getPatientById(parsed.data.patient_id);
        if (!patient)
            return notFound("Patient not found");
        const p = patient;
        if (p.doctor_id !== authed.user.sub)
            return notFound("Patient not found");
        // Key structure: patient/<id>/<doctorSub>/<timestamp>_<filename>
        const key = `patient/${parsed.data.patient_id}/${authed.user.sub}/${Date.now()}_${safeKeyPart(parsed.data.filename)}`;
        const presigned = await presignUpload(key, parsed.data.content_type);
        const created = await createReport({
            patient_id: parsed.data.patient_id,
            s3_key: key,
            uploaded_by_doctor_id: authed.user.sub,
            original_filename: parsed.data.filename,
            content_type: parsed.data.content_type,
            diagnosis: parsed.data.diagnosis,
            report_date: parsed.data.report_date
        });
        return ok({ report_id: created.report_id, upload: presigned });
    }
    if (event.httpMethod === "GET" && event.path === "/reports") {
        const denied = requireRole(authed.user, ["Patient"]);
        if (denied)
            return denied;
        const patient = await getPatientByUserId(authed.user.sub);
        if (!patient)
            return ok({ reports: [] });
        const p = patient;
        const reports = await listReportsForPatient(Number(p.patient_id));
        return ok({ reports: reports.map(({ s3_key, ...rest }) => rest) });
    }
    if (event.httpMethod === "GET" && event.path.startsWith("/reports/") && event.path.endsWith("/download")) {
        const denied = requireRole(authed.user, ["Admin", "Doctor", "Patient"]);
        if (denied)
            return denied;
        const reportIdStr = event.path.split("/")[2] ?? "";
        const reportId = Number(reportIdStr);
        if (!Number.isFinite(reportId) || reportId <= 0)
            return badRequest("Invalid report id");
        const report = await getReportById(reportId);
        if (!report)
            return notFound("Report not found");
        if (authed.user.role === "Doctor") {
            if (report.uploaded_by_doctor_id !== authed.user.sub)
                return notFound("Report not found");
        }
        else if (authed.user.role === "Patient") {
            const patient = await getPatientByUserId(authed.user.sub);
            const p = patient;
            if (!p?.patient_id || Number(p.patient_id) !== report.patient_id)
                return notFound("Report not found");
        } // Admin allowed
        const presigned = await presignDownload(report.s3_key);
        return ok({ report_id: report.report_id, filename: report.original_filename, content_type: report.content_type, download: presigned });
    }
    return notFound();
}
