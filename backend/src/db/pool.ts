import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

let dbPromise: Promise<Database> | null = null;

export function getPool() {
  if (!dbPromise) {
    dbPromise = open({
      filename: path.join(process.cwd(), 'database.db'),
      driver: sqlite3.Database
    }).then(async db => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS Patients (
          patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_id TEXT NOT NULL,
          patient_user_id TEXT NULL,
          name TEXT NOT NULL,
          age INTEGER NOT NULL,
          medical_history TEXT,
          diagnosis TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS Reports (
          report_id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          s3_key TEXT NOT NULL,
          uploaded_by_doctor_id TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          content_type TEXT NOT NULL,
          diagnosis TEXT,
          report_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES Patients(patient_id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS AuditLogs (
          log_id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NULL,
          details TEXT NULL,
          ip_address TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return db;
    });
  }

  return {
    run: async (sql: string, params?: any) => {
      const db = await dbPromise!;
      return db.run(sql, params);
    },
    all: async (sql: string, params?: any) => {
      const db = await dbPromise!;
      return db.all(sql, params);
    },
    get: async (sql: string, params?: any) => {
      const db = await dbPromise!;
      return db.get(sql, params);
    }
  };
}

