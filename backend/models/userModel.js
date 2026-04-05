import { all, get, run } from "../config/db.js";

export async function createUser({ email, passwordHash, role }) {
  const result = await run(
    `INSERT INTO users (email, password_hash, role) VALUES (:email, :password_hash, :role)`,
    { ":email": email, ":password_hash": passwordHash, ":role": role }
  );
  return result.lastID ?? result.insertId;
}

export async function getUserByEmail(email) {
  return get(`SELECT id, email, password_hash AS passwordHash, role, created_at FROM users WHERE email = :email`, {
    ":email": email
  });
}

export async function getUserById(id) {
  return get(`SELECT id, email, role, created_at FROM users WHERE id = :id`, { ":id": id });
}

export async function listUsers() {
  return all(`SELECT id, email, role, created_at FROM users ORDER BY id DESC`);
}

export async function updateUserRole(id, role) {
  const result = await run(`UPDATE users SET role = :role WHERE id = :id`, { ":role": role, ":id": id });
  return result.changes;
}

export async function listDoctors() {
  return all(`SELECT id, email FROM users WHERE role = 'Doctor' ORDER BY email ASC`);
}

