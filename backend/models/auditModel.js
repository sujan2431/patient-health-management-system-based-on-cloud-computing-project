import { all, get, run } from "../config/db.js";

export async function addAuditLog({ userId, action, metadata }) {
  const metaText = metadata == null ? null : JSON.stringify(metadata);
  const result = await run(
    `INSERT INTO audit_logs (user_id, action, metadata) VALUES (:user_id, :action, :metadata)`,
    { ":user_id": userId ?? null, ":action": action, ":metadata": metaText }
  );
  return result.lastID ?? result.insertId;
}

export async function listAuditLogs({ userId, action, from, to } = {}) {
  const where = [];
  const params = {};

  if (userId != null) {
    where.push("user_id = :user_id");
    params[":user_id"] = userId;
  }

  if (action) {
    where.push("action LIKE :action");
    params[":action"] = `%${action}%`;
  }

  if (from) {
    where.push("DATE(timestamp) >= DATE(:from)");
    params[":from"] = from;
  }

  if (to) {
    where.push("DATE(timestamp) <= DATE(:to)");
    params[":to"] = to;
  }

  const sql = `
    SELECT * FROM audit_logs
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY id DESC
    LIMIT 1000
  `;

  return all(sql, params);
}

export async function getAuditLog(id) {
  return get(`SELECT * FROM audit_logs WHERE id = :id LIMIT 1`, { ":id": id });
}

