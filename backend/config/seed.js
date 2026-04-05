import bcrypt from "bcrypt";
import { get, run } from "./db.js";
import { createPatient, getPatientByUserId, linkPatientToUser } from "../models/patientModel.js";
import { getUserByEmail } from "../models/userModel.js";

/**
 * Inserts default demo accounts when the database has no users.
 * Password for all three: Password1!
 * Only runs when `users` row count is 0 (safe for production after first deploy).
 */
export async function seedDemoUsersIfEmpty() {
  const row = await get(`SELECT COUNT(*) AS cnt FROM users`);
  const cnt = Number(row?.cnt ?? 0);
  if (cnt > 0) return;

  const passwordHash = await bcrypt.hash("Password1!", 10);

  const accounts = [
    { email: "admin@hospital.com", role: "Admin" },
    { email: "doctor@hospital.com", role: "Doctor" },
    { email: "patient@hospital.com", role: "Patient" }
  ];

  for (const { email, role } of accounts) {
    await run(
      `INSERT INTO users (email, password_hash, role) VALUES (:email, :password_hash, :role)`,
      { ":email": email, ":password_hash": passwordHash, ":role": role }
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    "[seed] Demo users created — password for all: Password1! — admin@hospital.com, doctor@hospital.com, patient@hospital.com"
  );
}

/**
 * Ensures demo patient@hospital.com has a row in `patients` with user_id set.
 * Runs on every startup (idempotent) so older DBs that only had demo users still work.
 */
export async function ensureDemoPatientProfileLinked() {
  const doctor = await getUserByEmail("doctor@hospital.com");
  const patientUser = await getUserByEmail("patient@hospital.com");
  if (!doctor || doctor.role !== "Doctor" || !patientUser || patientUser.role !== "Patient") {
    return;
  }

  const existing = await getPatientByUserId(patientUser.id);
  if (existing) return;

  const patientId = await createPatient({
    doctorId: doctor.id,
    name: "Demo Patient",
    age: 35,
    disease: null,
    medical_history: "Seeded demo profile for patient@hospital.com",
    diagnosis: null
  });
  await linkPatientToUser(patientId, patientUser.id);

  // eslint-disable-next-line no-console
  console.log(`[seed] Linked patient@hospital.com to patients.id=${patientId} (doctor@hospital.com)`);
}
