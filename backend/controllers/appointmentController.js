import { z } from "zod";

import { addAuditLog } from "../models/auditModel.js";
import {
  getPatientByUserId
} from "../models/patientModel.js";
import {
  createAppointment,
  listAppointmentsForAdmin,
  listAppointmentsForDoctor,
  listAppointmentsForPatient,
  getAppointmentById,
  updateAppointmentDecision
} from "../models/appointmentModel.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../middleware/errors.js";
import { getUserById, listDoctors } from "../models/userModel.js";

export async function listDoctorsForBooking(req, res) {
  if (req.user.role !== "Patient") throw new ForbiddenError("Insufficient role");
  const doctors = await listDoctors();
  return res.json({ doctors });
}

export async function bookAppointment(req, res) {
  if (req.user.role !== "Patient") throw new ForbiddenError("Insufficient role");

  const patient = await getPatientByUserId(req.user.userId);
  if (!patient) throw new NotFoundError("Patient profile not found");

  const Schema = z.object({
    doctor_id: z.coerce.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
  });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid body", parsed.error.flatten());

  const doctorUser = await getUserById(parsed.data.doctor_id);
  if (!doctorUser || doctorUser.role !== "Doctor") throw new BadRequestError("Invalid doctor_id");

  const appointmentId = await createAppointment({
    patientId: patient.id,
    doctorId: parsed.data.doctor_id,
    date: parsed.data.date
  });

  await addAuditLog({
    userId: req.user.userId,
    action: "appointment_created",
    metadata: { appointmentId }
  });

  return res.status(201).json({ appointment_id: appointmentId });
}

export async function listAppointments(req, res) {
  if (req.user.role === "Doctor") {
    const appointments = await listAppointmentsForDoctor(req.user.userId);
    return res.json({ appointments });
  }

  if (req.user.role === "Admin") {
    const appointments = await listAppointmentsForAdmin();
    return res.json({ appointments });
  }

  if (req.user.role === "Patient") {
    const patient = await getPatientByUserId(req.user.userId);
    const appointments = patient ? await listAppointmentsForPatient(patient.id) : [];
    return res.json({ appointments });
  }

  throw new ForbiddenError("Insufficient role");
}

export async function decisionAppointment(req, res) {
  if (req.user.role !== "Doctor") throw new ForbiddenError("Insufficient role");

  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) throw new BadRequestError("Invalid appointment id");

  const Schema = z.object({
    status: z.enum(["approved", "rejected"])
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid body", parsed.error.flatten());

  const appointment = await getAppointmentById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");

  if (appointment.doctor_id !== req.user.userId) throw new NotFoundError("Appointment not found");

  const changes = await updateAppointmentDecision(id, parsed.data.status);
  if (!changes) throw new NotFoundError("Appointment not found");

  await addAuditLog({
    userId: req.user.userId,
    action: "appointment_decision",
    metadata: { appointmentId: id, status: parsed.data.status }
  });

  return res.json({ updated: true });
}

