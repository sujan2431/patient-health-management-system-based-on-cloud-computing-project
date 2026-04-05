import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";

import { addAuditLog } from "../models/auditModel.js";
import { getPatientById, getPatientByUserId } from "../models/patientModel.js";
import { createReport, getReportById, listReportsForDoctor, listReportsForAdmin, listReportsForPatient } from "../models/reportModel.js";
import { generateMedicalSummary } from "../services/aiSummaryService.js";
import { notifyReportUploaded } from "../services/notificationService.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../middleware/errors.js";

export async function uploadReport(req, res) {
  const Schema = z.object({
    patient_id: z.coerce.number().int().positive(),
    // Notes are optional for demos; AI summary will fall back to a mock/filename-based summary.
    reportText: z.string().max(20000).optional().default("")
  });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid request body", parsed.error.flatten());

  if (!req.file) throw new BadRequestError("File is required");
  if (req.user.role !== "Doctor" && req.user.role !== "Admin") throw new ForbiddenError("Insufficient role");

  const patientId = parsed.data.patient_id;
  const reportText = parsed.data.reportText;

  const patient = await getPatientById(patientId);
  if (!patient) throw new NotFoundError("Patient not found");

  if (req.user.role === "Doctor" && patient.doctor_id !== req.user.userId) {
    throw new NotFoundError("Patient not found");
  }

  const summary = await generateMedicalSummary({
    reportText,
    fileName: req.file.originalname
  });

  const relativeFilePath = path
    .relative(process.cwd(), req.file.path)
    .split(path.sep)
    .join("/");

  const mimeType = req.file.mimetype;

  const reportId = await createReport({
    patientId,
    uploadedBy: req.user.userId,
    filePath: relativeFilePath,
    fileName: req.file.originalname,
    mimeType,
    reportText,
    summary
  });

  await addAuditLog({
    userId: req.user.userId,
    action: "report_upload",
    metadata: { reportId, patientId }
  });

  // Notify if linked patient account exists
  if (patient?.linkedUserEmail) {
    await notifyReportUploaded({
      patientEmail: patient.linkedUserEmail,
      doctorEmail: req.user.email,
      patientName: patient.name,
      reportId
    });
  } else {
    // eslint-disable-next-line no-console
    console.log(`[NOTIFY MOCK] report_uploaded id=${reportId} (patient not linked yet)`);
  }

  return res.status(201).json({ report_id: reportId, summary });
}

export async function getReport(req, res) {
  const reportId = Number(req.params.id);
  if (!Number.isFinite(reportId) || reportId <= 0) throw new BadRequestError("Invalid report id");

  const report = await getReportById(reportId);
  if (!report) throw new NotFoundError("Report not found");

  if (req.user.role === "Doctor" && report.patientDoctorId !== req.user.userId) {
    throw new NotFoundError("Report not found");
  }

  if (req.user.role === "Patient" && report.patientUserId !== req.user.userId) {
    throw new NotFoundError("Report not found");
  }

  await addAuditLog({
    userId: req.user.userId,
    action: "report_access",
    metadata: { reportId }
  });

  return res.json({ report });
}

export async function listReports(req, res) {
  const patientId = req.query.patient_id ? Number(req.query.patient_id) : null;

  if (req.user.role === "Doctor") {
    const reports = await listReportsForDoctor(req.user.userId);
    return res.json({ reports });
  }

  if (req.user.role === "Admin") {
    if (patientId) {
      // Admin could query by patient, but keep simple.
      const reports = await listReportsForAdmin();
      return res.json({ reports: reports.filter((r) => r.patient_id === patientId) });
    }
    return res.json({ reports: await listReportsForAdmin() });
  }

  if (req.user.role === "Patient") {
    const patient = await getPatientByUserId(req.user.userId);
    if (!patient) return res.json({ reports: [] });
    const reports = await listReportsForPatient(patient.id);
    return res.json({ reports });
  }

  throw new ForbiddenError("Insufficient role");
}

export async function downloadReport(req, res) {
  const reportId = Number(req.params.id);
  if (!Number.isFinite(reportId) || reportId <= 0) throw new BadRequestError("Invalid report id");

  const report = await getReportById(reportId);
  if (!report) throw new NotFoundError("Report not found");

  if (req.user.role === "Doctor" && report.patientDoctorId !== req.user.userId) {
    throw new NotFoundError("Report not found");
  }

  if (req.user.role === "Patient" && report.patientUserId !== req.user.userId) {
    throw new NotFoundError("Report not found");
  }

  await addAuditLog({
    userId: req.user.userId,
    action: "report_download",
    metadata: { reportId }
  });

  const absolutePath = path.isAbsolute(report.file_path) ? report.file_path : path.join(process.cwd(), report.file_path);
  try {
    await fs.access(absolutePath);
  } catch {
    throw new NotFoundError("File not found on server");
  }

  return res.download(absolutePath, report.file_name);
}

