import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
(async () => {
  const db = await open({ filename: 'database.db', driver: sqlite3.Database });
  await db.run("UPDATE Patients SET patient_user_id = 'patient-001'");
  console.log('Linked all patients to patient-001');
})().catch(console.error);
