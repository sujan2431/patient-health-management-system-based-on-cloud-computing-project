import { z } from "zod";
import { getPool } from "./pool.js";

export const PatientCreateSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).max(150),
  medical_history: z.string().optional().default(""),
  diagnosis: z.string().optional().default("")
});

export async function createPatient(input: z.infer<typeof PatientCreateSchema>, doctorUserId: string) {
  const pool = getPool();
  const res = await pool.run(
    "INSERT INTO Patients (doctor_id, name, age, medical_history, diagnosis) VALUES (:doctor_id, :name, :age, :medical_history, :diagnosis)",
    {
      ":doctor_id": doctorUserId,
      ":name": input.name,
      ":age": input.age,
      ":medical_history": input.medical_history ?? "",
      ":diagnosis": input.diagnosis ?? ""
    }
  );
  return { patient_id: res.lastID };
}

export async function listPatientsForDoctor(doctorUserId: string) {
  const rows = await getPool().all(
    "SELECT patient_id, doctor_id, patient_user_id, name, age, medical_history, diagnosis FROM Patients WHERE doctor_id = :doctor_id ORDER BY patient_id DESC",
    { ":doctor_id": doctorUserId }
  );
  return rows as unknown[];
}

export async function getPatientById(patientId: number) {
  const row = await getPool().get(
    "SELECT patient_id, doctor_id, patient_user_id, name, age, medical_history, diagnosis FROM Patients WHERE patient_id = :patient_id LIMIT 1",
    { ":patient_id": patientId }
  );
  return row ?? null;
}

export async function getPatientByUserId(patientUserId: string) {
  const row = await getPool().get(
    "SELECT patient_id, doctor_id, patient_user_id, name, age, medical_history, diagnosis FROM Patients WHERE patient_user_id = :patient_user_id LIMIT 1",
    { ":patient_user_id": patientUserId }
  );
  return row ?? null;
}

