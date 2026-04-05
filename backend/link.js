const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
(async () => {
  const db = await open({ filename: 'database.db', driver: sqlite3.Database });
  await db.run("UPDATE Patients SET patient_user_id = 'patient-001'");
  console.log('Linked all patients to patient-001');
})().catch(console.error);
