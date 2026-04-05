import { all, get, run } from "../config/db.js";

export async function createAppointment({ patientId, doctorId, date }) {
  const result = await run(
    `INSERT INTO appointments (patient_id, doctor_id, date, status)
     VALUES (:patient_id, :doctor_id, :date, 'pending')`,
    { ":patient_id": patientId, ":doctor_id": doctorId, ":date": date }
  );
  return result.lastID ?? result.insertId;
}

export async function getAppointmentById(id) {
  return get(
    `SELECT a.*,
            p.user_id AS patientUserId,
            p.name AS patientName
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.id = :id
     LIMIT 1`,
    { ":id": id }
  );
}

export async function listAppointmentsForPatient(patientId) {
  return all(
    `SELECT a.*, d.email AS doctorEmail
     FROM appointments a
     JOIN users d ON d.id = a.doctor_id
     WHERE a.patient_id = :patient_id
     ORDER BY a.id DESC`,
    { ":patient_id": patientId }
  );
}

export async function listAppointmentsForDoctor(doctorId) {
  return all(
    `SELECT a.*, p.name AS patientName, p.user_id AS patientUserId
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.doctor_id = :doctor_id
     ORDER BY a.id DESC`,
    { ":doctor_id": doctorId }
  );
}

export async function listAppointmentsForAdmin() {
  return all(
    `SELECT a.*, p.name AS patientName, d.email AS doctorEmail
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN users d ON d.id = a.doctor_id
     ORDER BY a.id DESC
     LIMIT 1000`
  );
}

export async function updateAppointmentDecision(id, status) {
  const result = await run(
    `UPDATE appointments SET status = :status WHERE id = :id`,
    { ":status": status, ":id": id }
  );
  return result.changes ?? result.affectedRows ?? 0;
}

