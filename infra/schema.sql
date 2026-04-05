CREATE TABLE IF NOT EXISTS Users (
  user_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role ENUM('Admin','Doctor','Patient') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Patients (
  patient_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  doctor_id VARCHAR(64) NOT NULL,
  patient_user_id VARCHAR(64) NULL,
  name VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  medical_history TEXT,
  diagnosis TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_patients_doctor (doctor_id),
  UNIQUE KEY uniq_patients_patient_user (patient_user_id)
);

CREATE TABLE IF NOT EXISTS Reports (
  report_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT NOT NULL,
  s3_key VARCHAR(1024) NOT NULL,
  uploaded_by_doctor_id VARCHAR(64) NOT NULL,
  original_filename VARCHAR(512) NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  diagnosis TEXT,
  report_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_patient (patient_id),
  CONSTRAINT fk_reports_patient FOREIGN KEY (patient_id) REFERENCES Patients(patient_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AuditLogs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(64) NOT NULL,
  action VARCHAR(255) NOT NULL,
  resource_type ENUM('Patient', 'Report', 'Authentication') NOT NULL,
  resource_id VARCHAR(1024) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action)
);
