import { getPool } from "./pool.js";

export type ReportRow = {
  report_id: number;
  patient_id: number;
  s3_key: string;
  uploaded_by_doctor_id: string;
  original_filename: string;
  content_type: string;
  diagnosis: string | null;
  report_date: string | null;
  created_at: string;
};

export async function createReport(input: {
  patient_id: number;
  s3_key: string;
  uploaded_by_doctor_id: string;
  original_filename: string;
  content_type: string;
  diagnosis?: string;
  report_date?: string; // YYYY-MM-DD
}) {
  const res = await getPool().run(
    `INSERT INTO Reports
      (patient_id, s3_key, uploaded_by_doctor_id, original_filename, content_type, diagnosis, report_date)
     VALUES
      (:patient_id, :s3_key, :uploaded_by_doctor_id, :original_filename, :content_type, :diagnosis, :report_date)`,
    {
      ":patient_id": input.patient_id,
      ":s3_key": input.s3_key,
      ":uploaded_by_doctor_id": input.uploaded_by_doctor_id,
      ":original_filename": input.original_filename,
      ":content_type": input.content_type,
      ":diagnosis": input.diagnosis ?? null,
      ":report_date": input.report_date ?? null
    }
  );
  return { report_id: res.lastID };
}

export async function getReportById(reportId: number): Promise<ReportRow | null> {
  const row = await getPool().get(
    `SELECT report_id, patient_id, s3_key, uploaded_by_doctor_id, original_filename, content_type, diagnosis, report_date, created_at
     FROM Reports
     WHERE report_id = :report_id
     LIMIT 1`,
    { ":report_id": reportId }
  );
  return (row as ReportRow) ?? null;
}

export async function listReportsForPatient(patientId: number): Promise<ReportRow[]> {
  const rows = await getPool().all(
    `SELECT report_id, patient_id, s3_key, uploaded_by_doctor_id, original_filename, content_type, diagnosis, report_date, created_at
     FROM Reports
     WHERE patient_id = :patient_id
     ORDER BY report_id DESC`,
    { ":patient_id": patientId }
  );
  return rows as ReportRow[];
}

