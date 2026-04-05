import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { apiGet, apiPost, apiLogin, apiUploadReport } from "./lib/api";
import { saveToken, getToken, clearToken } from "./lib/amplify";

type BackendMe = { user: { sub: string; email?: string; role: "Admin" | "Doctor" | "Patient" } };
type Patient = {
  id: number;
  name: string;
  age: number;
  disease?: string | null;
  medical_history?: string | null;
  diagnosis?: string | null;
  linkedUserEmail?: string | null;
};

type Report = {
  id: number;
  patient_id: number;
  uploaded_by: number;
  file_path: string;
  file_name: string;
  mime_type: string;
  report_text?: string | null;
  summary: string;
  created_at: string;
  patientName?: string | null;
  patientDoctorId?: number | null;
  patientUserId?: number | null;
};

type Appointment = {
  id: number;
  patient_id: number;
  doctor_id: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
  doctorEmail?: string | null;
  patientName?: string | null;
};

type DoctorOption = { id: number; email: string };

function envMissing() {
  const need = ["VITE_API_BASE_URL"];
  return need.filter((k) => !import.meta.env[k]);
}

export default function App() {
  const missing = useMemo(() => envMissing(), []);
  const [authState, setAuthState] = useState<"unknown" | "signedOut" | "signedIn">("unknown");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState<BackendMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorsForBooking, setDoctorsForBooking] = useState<DoctorOption[]>([]);

  const [newPatient, setNewPatient] = useState({ name: "", age: 0, medical_history: "", diagnosis: "" });
  const [uploadPatientId, setUploadPatientId] = useState<number>(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [linkPatientId, setLinkPatientId] = useState<number>(0);
  const [linkPatientEmail, setLinkPatientEmail] = useState<string>("");
  const [linkPatientPhone, setLinkPatientPhone] = useState<string>("");
  const [apptDoctorId, setApptDoctorId] = useState<number>(0);
  const [apptDate, setApptDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function refresh() {
    setError(null);
    try {
      const m = await apiGet<BackendMe>("/me");
      setMe(m);

      if (m.user.role === "Doctor") {
        const pl = await apiGet<{ patients: Patient[] }>("/patients");
        setPatients(pl.patients);
        const rl = await apiGet<{ reports: Report[] }>("/reports");
        setReports(rl.reports);
        const al = await apiGet<{ appointments: Appointment[] }>("/appointments");
        setAppointments(al.appointments);
        setDoctorsForBooking([]);
      } else if (m.user.role === "Admin") {
        setPatients([]);
        setReports([]);
        setAppointments([]);
        setDoctorsForBooking([]);
      } else if (m.user.role === "Patient") {
        const rl = await apiGet<{ reports: Report[] }>("/reports");
        setReports(rl.reports);
        setPatients([]);
        const al = await apiGet<{ appointments: Appointment[] }>("/appointments");
        setAppointments(al.appointments);
        const dl = await apiGet<{ doctors: DoctorOption[] }>("/appointments/doctors");
        setDoctorsForBooking(dl.doctors);
      } else {
        setPatients([]);
        setReports([]);
        setAppointments([]);
        setDoctorsForBooking([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (token) {
        setAuthState("signedIn");
        await refresh();
      } else {
        setAuthState("signedOut");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSignIn() {
    setError(null);
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail) throw new Error("Enter your email");
      if (!password) throw new Error("Enter your password");

      const result = await apiLogin(cleanEmail, password);
      saveToken(result.token);
      setAuthState("signedIn");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
  }

  async function onSignOut() {
    clearToken();
    setAuthState("signedOut");
    setMe(null);
    setPatients([]);
    setReports([]);
    setAppointments([]);
    setDoctorsForBooking([]);
  }

  async function bookAppointment() {
    setError(null);
    try {
      if (!apptDoctorId) throw new Error("Select a doctor");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(apptDate)) throw new Error("Choose a valid date");

      await apiPost<{ appointment_id: number }>("/appointments", {
        doctor_id: apptDoctorId,
        date: apptDate
      });
      await refresh();
      setError("Appointment request sent. Your doctor will approve or reject it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    }
  }

  async function decideAppointment(id: number, status: "approved" | "rejected") {
    setError(null);
    try {
      await apiPost<{ updated: boolean }>(`/appointments/${id}/decision`, { status });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function createPatient() {
    setError(null);
    try {
      const out = await apiPost<{ patient_id: number }>("/patients", {
        name: newPatient.name,
        age: Number(newPatient.age),
        medical_history: newPatient.medical_history,
        diagnosis: newPatient.diagnosis
      });
      setNewPatient({ name: "", age: 0, medical_history: "", diagnosis: "" });
      await refresh();
      setUploadPatientId(out.patient_id);
      setLinkPatientId(out.patient_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  }

  async function linkPatientToUser() {
    setError(null);
    try {
      if (!linkPatientId) throw new Error("Choose a patient_id to link");
      if (!linkPatientEmail) throw new Error("Enter patient email to link");

      const phone = linkPatientPhone.trim();
      if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) {
        throw new Error("SMS phone must be E.164 (e.g. +15551234567)");
      }

      const out = await apiPost<{
        linked: boolean;
        sms: { attempted: boolean; sent?: boolean; mock?: boolean };
      }>(`/patients/${linkPatientId}/link`, {
        patient_user_email: linkPatientEmail.toLowerCase(),
        ...(phone ? { phone_e164: phone } : {})
      });

      await refresh();
      let msg = "Patient linked successfully.";
      if (out.sms?.attempted) {
        msg += out.sms.sent
          ? " SMS sent to the patient."
          : " SMS simulated (check server logs; set Twilio env vars to send real texts).";
      }
      setError(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Link failed");
    }
  }

  async function uploadReport() {
    setError(null);
    try {
      if (!uploadPatientId) throw new Error("Choose a patient_id");
      if (!uploadFile) throw new Error("Choose a file");

      const out = await apiUploadReport<{ report_id: number; summary: string }>({
        path: "/reports/upload",
        patient_id: uploadPatientId,
        file: uploadFile,
        // UI currently has no report notes box; backend supports empty reportText.
        reportText: ""
      });
      await refresh();
      setError(`Uploaded. report_id=${out.report_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function downloadReport(reportId: number) {
    setError(null);
    try {
      // Backend returns the file stream directly (res.download), not a JSON URL.
      const token = getToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4001"}/reports/${reportId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Download failed (${res.status})`);
      }

      const blob = await res.blob();

      // Try to extract filename from Content-Disposition header.
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const filename = decodeURIComponent(match?.[1] ?? match?.[2] ?? `report_${reportId}`);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  return (
    <div className="container">
      <header className="nav-header">
        <h1>Patient Health</h1>
        {authState === "signedIn" && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span className="status-badge">{me?.user.role}</span>
            <button className="btn-secondary" onClick={onSignOut}>Sign out</button>
          </div>
        )}
      </header>

      {missing.length > 0 && (
        <div className="error-toast">
          <strong>Missing environment configuration:</strong> {missing.join(", ")}
        </div>
      )}

      {error && <div className="error-toast">{error}</div>}

      {authState !== "signedIn" ? (
        <div className="glass-card auth-container">
          <h2>Welcome Back</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>Please sign in to access EHR records</p>
          <div className="input-group">
            <label>Email Address</label>
            <input placeholder="name@hospital.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSignIn()} />
          </div>
          <button onClick={onSignIn} style={{ marginTop: "1rem" }}>Sign in</button>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>
            Healthcare professionals and patients use role-based access.
          </p>
        </div>
      ) : (
        <main>
          <div className="stats-grid">
            <div className="card">
              <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>User Identity</div>
              <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{me?.user.email || "Healthcare User"}</div>
            </div>
            <div className="card">
              <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Last Updated</div>
              <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="dashboard-grid">
            {me?.user.role === "Doctor" && (
              <div className="glass-card">
                <h2>Doctor Console</h2>
                
                <section style={{ marginBottom: "2rem" }}>
                  <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Register New Patient</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                    <div className="input-group">
                      <label>Patient Name</label>
                      <input value={newPatient.name} onChange={(e) => setNewPatient((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="input-group">
                      <label>Age</label>
                      <input type="number" value={newPatient.age} onChange={(e) => setNewPatient((p) => ({ ...p, age: Number(e.target.value) }))} />
                    </div>
                    <div className="input-group" style={{ gridColumn: "span 2" }}>
                      <label>Medical History</label>
                      <input value={newPatient.medical_history} onChange={(e) => setNewPatient((p) => ({ ...p, medical_history: e.target.value }))} />
                    </div>
                    <button onClick={createPatient} style={{ gridColumn: "span 2" }}>Create Record</button>
                  </div>
                </section>

                <section style={{ marginBottom: "2rem" }}>
                  <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Your patients</h3>
                  {patients.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", marginTop: "0.75rem" }}>No patients yet — create one above.</p>
                  ) : (
                    <ul style={{ marginTop: "0.75rem", paddingLeft: "1.25rem" }}>
                      {patients.map((p) => (
                        <li key={p.id} style={{ marginBottom: "0.35rem" }}>
                          #{p.id} — {p.name} (age {p.age}) {p.linkedUserEmail ? `(linked: ${p.linkedUserEmail})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section style={{ marginBottom: "2rem" }}>
                  <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Appointment requests</h3>
                  {appointments.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", marginTop: "0.75rem" }}>No appointment requests yet.</p>
                  ) : (
                    <ul style={{ marginTop: "0.75rem", listStyle: "none", padding: 0 }}>
                      {appointments.map((a) => (
                        <li
                          key={a.id}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.65rem 0",
                            borderBottom: "1px solid var(--border-color)"
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>#{a.id}</span>
                          <span>{a.patientName ?? `Patient #${a.patient_id}`}</span>
                          <span style={{ color: "var(--text-muted)" }}>{a.date}</span>
                          <span
                            style={{
                              textTransform: "capitalize",
                              fontSize: "0.85rem",
                              padding: "2px 8px",
                              borderRadius: 999,
                              background:
                                a.status === "approved"
                                  ? "rgba(34,197,94,0.15)"
                                  : a.status === "rejected"
                                    ? "rgba(239,68,68,0.12)"
                                    : "rgba(234,179,8,0.15)"
                            }}
                          >
                            {a.status}
                          </span>
                          {a.status === "pending" && (
                            <>
                              <button type="button" className="btn-secondary" onClick={() => decideAppointment(a.id, "approved")}>
                                Approve
                              </button>
                              <button type="button" onClick={() => decideAppointment(a.id, "rejected")}>
                                Reject
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Upload Medical Report</h3>
                  <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                    <div className="input-group">
                      <label>Select Patient ID</label>
                      <input type="number" value={uploadPatientId || ""} onChange={(e) => setUploadPatientId(Number(e.target.value))} />
                    </div>
                    <div className="input-group">
                      <label>Medical File (PDF/Image)</label>
                      <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <button className="btn-secondary" onClick={uploadReport}>Upload to Secure Cloud</button>
                  </div>
                </section>

                <section style={{ marginTop: "2rem" }}>
                  <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Link Patient Account</h3>
                  <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                    <div className="input-group">
                      <label>Patient ID</label>
                      <input type="number" value={linkPatientId || ""} onChange={(e) => setLinkPatientId(Number(e.target.value))} />
                    </div>
                    <div className="input-group">
                      <label>Patient Email</label>
                      <input placeholder="patient@hospital.com" value={linkPatientEmail} onChange={(e) => setLinkPatientEmail(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Patient mobile (optional, E.164)</label>
                      <input
                        placeholder="+15551234567"
                        value={linkPatientPhone}
                        onChange={(e) => setLinkPatientPhone(e.target.value)}
                      />
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        If set, we send an SMS with the portal link when the account is linked.
                      </span>
                    </div>
                    <button className="btn-secondary" onClick={linkPatientToUser}>Link to User</button>
                  </div>
                </section>
              </div>
            )}

          {me?.user.role === "Patient" && (
              <div className="glass-card">
                <h2>Appointments</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
                  Request a visit with a doctor. You must have a linked patient profile (ask your clinic to link your account).
                </p>
                <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div className="input-group">
                    <label>Doctor</label>
                    <select
                      value={apptDoctorId || ""}
                      onChange={(e) => setApptDoctorId(Number(e.target.value))}
                    >
                      <option value="">Select doctor…</option>
                      {doctorsForBooking.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Preferred date</label>
                    <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
                  </div>
                  <button type="button" onClick={bookAppointment}>
                    Request appointment
                  </button>
                </div>
                {appointments.length === 0 ? (
                  <p style={{ color: "var(--text-muted)" }}>No appointments yet.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {appointments.map((a) => (
                      <li
                        key={a.id}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.65rem 0",
                          borderBottom: "1px solid var(--border-color)"
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>#{a.id}</span>
                        <span style={{ color: "var(--text-muted)" }}>{a.doctorEmail ?? `Doctor #${a.doctor_id}`}</span>
                        <span>{a.date}</span>
                        <span
                          style={{
                            textTransform: "capitalize",
                            fontSize: "0.85rem",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background:
                              a.status === "approved"
                                ? "rgba(34,197,94,0.15)"
                                : a.status === "rejected"
                                  ? "rgba(239,68,68,0.12)"
                                  : "rgba(234,179,8,0.15)"
                          }}
                        >
                          {a.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <h2 style={{ marginTop: "2rem" }}>My Medical Reports</h2>
                {reports.length === 0 ? (
                  <p style={{ color: "var(--text-muted)" }}>No health records available at this time.</p>
                ) : (
                  <ul className="report-list">
                    {reports.map((r) => (
                    <li key={r.id} className="report-item">
                        <div>
                        <div style={{ fontWeight: 600 }}>{r.file_name}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          Uploaded: {new Date(r.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ marginTop: 6, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {r.summary}
                        </div>
                        </div>
                      <button className="btn-secondary" onClick={() => downloadReport(r.id)}>Download</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
