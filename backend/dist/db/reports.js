import { getPool } from "./pool.js";
export async function createReport(input) {
    const [res] = await getPool().execute(`INSERT INTO Reports
      (patient_id, s3_key, uploaded_by_doctor_id, original_filename, content_type, diagnosis, report_date)
     VALUES
      (:patient_id, :s3_key, :uploaded_by_doctor_id, :original_filename, :content_type, :diagnosis, :report_date)`, {
        patient_id: input.patient_id,
        s3_key: input.s3_key,
        uploaded_by_doctor_id: input.uploaded_by_doctor_id,
        original_filename: input.original_filename,
        content_type: input.content_type,
        diagnosis: input.diagnosis ?? null,
        report_date: input.report_date ?? null
    });
    return { report_id: res.insertId };
}
export async function getReportById(reportId) {
    const [rows] = await getPool().execute(`SELECT report_id, patient_id, s3_key, uploaded_by_doctor_id, original_filename, content_type, diagnosis, report_date, created_at
     FROM Reports
     WHERE report_id = :report_id
     LIMIT 1`, { report_id: reportId });
    const arr = rows;
    return arr[0] ?? null;
}
export async function listReportsForPatient(patientId) {
    const [rows] = await getPool().execute(`SELECT report_id, patient_id, s3_key, uploaded_by_doctor_id, original_filename, content_type, diagnosis, report_date, created_at
     FROM Reports
     WHERE patient_id = :patient_id
     ORDER BY report_id DESC`, { patient_id: patientId });
    return rows;
}
