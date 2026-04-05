import { getPool } from "./pool.js";

export type AuditResourceType = "Patient" | "Report" | "Authentication";

export interface AuditLogEntry {
  user_id: string;
  action: string;
  resource_type: AuditResourceType;
  resource_id?: string;
  details?: any;
  ip_address?: string;
}

export async function logAction(entry: AuditLogEntry) {
  try {
    await getPool().run(
      `INSERT INTO AuditLogs (user_id, action, resource_type, resource_id, details, ip_address)
       VALUES (:user_id, :action, :resource_type, :resource_id, :details, :ip_address)`,
      {
        ":user_id": entry.user_id,
        ":action": entry.action,
        ":resource_type": entry.resource_type,
        ":resource_id": entry.resource_id ?? null,
        ":details": entry.details ? JSON.stringify(entry.details) : null,
        ":ip_address": entry.ip_address ?? null
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to log audit action:", error);
  }
}
