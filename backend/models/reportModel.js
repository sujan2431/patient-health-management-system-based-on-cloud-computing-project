import { all, get, run } from "../config/db.js";

export async function createReport({
  patientId,
  uploadedBy,
  filePath,
  fileName,
  mimeType,
  reportText,
  summary
}) {
  const result = await run(
    `INSERT INTO reports
      (patient_id, uploaded_by, file_path, file_name, mime_type, report_text, summary)
     VALUES
      (:patient_id, :uploaded_by, :file_path, :file_name, :mime_type, :report_text, :summary)`,
    {
      ":patient_id": patientId,
      ":uploaded_by": uploadedBy,
      ":file_path": filePath,
      ":file_name": fileName,
      ":mime_type": mimeType,
      ":report_text": reportText ?? null,
      ":summary": summary
    }
  );

  return result.lastID ?? result.insertId;
}

export async function getReportById(reportId) {
  return get(
    `SELECT r.*,
            p.doctor_id AS patientDoctorId,
            p.user_id AS patientUserId
     FROM reports r
     JOIN patients p ON p.id = r.patient_id
     WHERE r.id = :id
     LIMIT 1`,
    { ":id": reportId }
  );
}

export async function listReportsForPatient(patientId) {
  return all(
    `SELECT r.*, u.email AS uploadedByEmail
     FROM reports r
     LEFT JOIN users u ON u.id = r.uploaded_by
     WHERE r.patient_id = :patient_id
     ORDER BY r.id DESC`,
    { ":patient_id": patientId }
  );
}

export async function listReportsForDoctor(doctorId) {
  return all(
    `SELECT r.*,
            p.user_id AS patientUserId,
            p.name AS patientName
     FROM reports r
     JOIN patients p ON p.id = r.patient_id
     WHERE p.doctor_id = :doctor_id
     ORDER BY r.id DESC`,
    { ":doctor_id": doctorId }
  );
}

export async function listReportsForAdmin() {
  return all(
    `SELECT r.*,
            p.name AS patientName,
            p.user_id AS patientUserId,
            p.doctor_id AS patientDoctorId
     FROM reports r
     JOIN patients p ON p.id = r.patient_id
     ORDER BY r.id DESC`
  );
}

