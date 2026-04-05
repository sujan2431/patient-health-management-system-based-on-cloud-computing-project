import { all, get, run } from "../config/db.js";

export async function createPatient({
  doctorId,
  name,
  age,
  disease,
  medical_history,
  diagnosis
}) {
  const result = await run(
    `INSERT INTO patients (doctor_id, user_id, name, age, disease, medical_history, diagnosis)
     VALUES (:doctor_id, NULL, :name, :age, :disease, :medical_history, :diagnosis)`,
    {
      ":doctor_id": doctorId,
      ":name": name,
      ":age": age,
      ":disease": disease ?? null,
      ":medical_history": medical_history ?? null,
      ":diagnosis": diagnosis ?? null
    }
  );

  return result.lastID ?? result.insertId;
}

export async function linkPatientToUser(patientId, userId) {
  // Ensure a patient user is linked to at most one patient record.
  // This prevents UNIQUE(user_id) constraint failures and keeps behavior predictable.
  await run(
    `UPDATE patients
     SET user_id = NULL
     WHERE user_id = :user_id AND id != :patient_id`,
    { ":user_id": userId, ":patient_id": patientId }
  );

  await run(`UPDATE patients SET user_id = :user_id WHERE id = :patient_id`, {
    ":user_id": userId,
    ":patient_id": patientId
  });
}

export async function getPatientById(patientId) {
  return get(
    `SELECT p.*, u.email AS linkedUserEmail
     FROM patients p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = :id
     LIMIT 1`,
    { ":id": patientId }
  );
}

export async function getPatientByUserId(userId) {
  return get(
    `SELECT p.*, u.email AS linkedUserEmail
     FROM patients p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.user_id = :user_id
     LIMIT 1`,
    { ":user_id": userId }
  );
}

export async function listPatientsForAdmin(filters = {}) {
  return listPatients({ admin: true, ...filters });
}

export async function listPatientsForDoctor(doctorId, filters = {}) {
  return listPatients({ admin: false, doctorId, ...filters });
}

function coerceQ(q) {
  if (q == null) return null;
  const trimmed = String(q).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : trimmed;
}

async function listPatients({ admin, doctorId, q, disease, from, to }) {
  const params = {};

  const where = [];
  if (!admin) {
    where.push("p.doctor_id = :doctor_id");
    params[":doctor_id"] = doctorId;
  }

  const qVal = coerceQ(q);
  if (typeof qVal === "number") {
    where.push("(p.id = :q_id OR p.name LIKE :q_name)");
    params[":q_id"] = qVal;
    params[":q_name"] = `%${qVal}%`;
  } else if (typeof qVal === "string") {
    where.push("p.name LIKE :q_name");
    params[":q_name"] = `%${qVal}%`;
  }

  if (disease) {
    where.push("p.disease LIKE :disease");
    params[":disease"] = `%${disease}%`;
  }

  if (from) {
    where.push("DATE(p.created_at) >= DATE(:from)");
    params[":from"] = from;
  }

  if (to) {
    where.push("DATE(p.created_at) <= DATE(:to)");
    params[":to"] = to;
  }

  const sql = `
    SELECT p.*, u.email AS linkedUserEmail
    FROM patients p
    LEFT JOIN users u ON u.id = p.user_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY p.id DESC
  `;

  return all(sql, params);
}

