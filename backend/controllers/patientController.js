import { z } from "zod";

import { addAuditLog } from "../models/auditModel.js";
import { getUserByEmail, getUserById } from "../models/userModel.js";
import {
  createPatient,
  getPatientById,
  getPatientByUserId,
  linkPatientToUser,
  listPatientsForAdmin,
  listPatientsForDoctor
} from "../models/patientModel.js";
import { notifyPatientCreated, notifyPatientLinked } from "../services/notificationService.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../middleware/errors.js";

const PatientCreateSchema = z.object({
  name: z.string().min(1).max(255),
  age: z.coerce.number().int().min(0).max(150),
  disease: z.string().optional().nullable(),
  medical_history: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  // Only used for Admin to choose which doctor owns the patient.
  doctor_id: z.coerce.number().int().positive().optional()
});

export async function createPatientHandler(req, res) {
  const parsed = PatientCreateSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid patient data", parsed.error.flatten());

  const role = req.user.role;
  const doctorId = role === "Doctor" ? req.user.userId : parsed.data.doctor_id;
  if (!doctorId) throw new ForbiddenError("doctor_id is required for Admin");

  const patientId = await createPatient({
    doctorId,
    name: parsed.data.name,
    age: parsed.data.age,
    disease: parsed.data.disease ?? null,
    medical_history: parsed.data.medical_history ?? null,
    diagnosis: parsed.data.diagnosis ?? null
  });

  await addAuditLog({
    userId: req.user.userId,
    action: "patient_creation",
    metadata: { patientId }
  });

  // Notify only if the patient is already linked to a patient user.
  const patient = await getPatientById(patientId);
  if (patient?.linkedUserEmail) {
    await notifyPatientCreated({
      patientEmail: patient.linkedUserEmail,
      doctorEmail: req.user.email,
      patientName: patient.name
    });
  } else {
    // eslint-disable-next-line no-console
    console.log(`[NOTIFY MOCK] patient_created id=${patientId} (no linked patient user yet)`);
  }

  return res.status(201).json({ patient_id: patientId });
}

export async function listPatientsHandler(req, res) {
  const { q, disease, from, to } = req.query;

  if (req.user.role === "Doctor") {
    const patients = await listPatientsForDoctor(req.user.userId, {
      q,
      disease,
      from,
      to
    });
    return res.json({ patients });
  }

  if (req.user.role === "Admin") {
    const patients = await listPatientsForAdmin({ q, disease, from, to });
    return res.json({ patients });
  }

  if (req.user.role === "Patient") {
    const p = await getPatientByUserId(req.user.userId);
    return res.json({ patients: p ? [p] : [] });
  }

  throw new ForbiddenError("Insufficient role");
}

export async function getPatientByIdHandler(req, res) {
  const patientId = Number(req.params.id);
  if (!Number.isFinite(patientId) || patientId <= 0) throw new BadRequestError("Invalid patient id");

  const patient = await getPatientById(patientId);
  if (!patient) throw new NotFoundError("Patient not found");

  if (req.user.role === "Doctor") {
    if (patient.doctor_id !== req.user.userId) throw new NotFoundError("Patient not found");
    return res.json({ patient });
  }

  if (req.user.role === "Admin") {
    return res.json({ patient });
  }

  if (req.user.role === "Patient") {
    if (patient.user_id !== req.user.userId) throw new NotFoundError("Patient not found");
    return res.json({ patient });
  }

  throw new ForbiddenError("Insufficient role");
}

export async function linkPatientToUserHandler(req, res) {
  const patientId = Number(req.params.id);
  if (!Number.isFinite(patientId) || patientId <= 0) throw new BadRequestError("Invalid patient id");

  const LinkSchema = z.object({
    patient_user_id: z.coerce.number().int().positive().optional(),
    patient_user_email: z.string().email().optional(),
    phone_e164: z.string().optional()
  });
  const parsed = LinkSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid body", parsed.error.flatten());

  const { patient_user_id: patientUserId, patient_user_email: patientUserEmail } = parsed.data;
  let phoneE164 = parsed.data.phone_e164?.trim();
  if (phoneE164 === "") phoneE164 = undefined;
  if (phoneE164 && !/^\+[1-9]\d{6,14}$/.test(phoneE164)) {
    throw new BadRequestError("phone_e164 must be E.164 format (e.g. +15551234567)");
  }
  if (!patientUserId && !patientUserEmail) throw new BadRequestError("patient_user_id or patient_user_email is required");

  const patient = await getPatientById(patientId);
  if (!patient) throw new NotFoundError("Patient not found");

  // Access control: only admins can link any patient. Doctors can link only their patients.
  if (req.user.role === "Doctor" && patient.doctor_id !== req.user.userId) {
    throw new NotFoundError("Patient not found");
  }

  let user = null;
  if (patientUserId) {
    user = await getUserById(patientUserId);
  } else if (patientUserEmail) {
    user = await getUserByEmail(patientUserEmail.toLowerCase());
  }

  if (!user) throw new NotFoundError("User not found");
  if (user.role !== "Patient") throw new BadRequestError("User must have role Patient");

  await linkPatientToUser(patientId, user.id);

  await addAuditLog({
    userId: req.user.userId,
    action: "patient_linked",
    metadata: { patientId, linkedUserId: user.id }
  });

  const linkedPatient = await getPatientById(patientId);

  let sms = { attempted: false };
  if (phoneE164) {
    const smsResult = await notifyPatientLinked({
      phoneE164,
      patientEmail: user.email,
      patientName: linkedPatient?.name ?? "your record"
    });
    sms = { attempted: true, sent: Boolean(smsResult.sent), mock: Boolean(smsResult.mock) };
  }

  return res.json({ linked: true, sms });
}

