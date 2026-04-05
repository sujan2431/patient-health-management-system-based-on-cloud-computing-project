import { getToken } from "./amplify.js";

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4001";

function getIdToken(): string {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = getIdToken();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `Request failed (${res.status})`);
  return json as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getIdToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `Request failed (${res.status})`);
  return json as T;
}

/** Call the local /login endpoint (no auth token needed) */
export async function apiLogin(email: string, password: string): Promise<{ token: string; user: { sub: string; email?: string; role: string } }> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    throw new Error(`Cannot reach API at ${baseUrl}. Start the backend (npm run dev in backend/, port 4000). ${msg}`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? "Login failed");
  return json;
}

export async function apiUploadReport<T>(args: {
  path: string; // usually "/reports/upload"
  patient_id: number;
  reportText?: string;
  file: File;
}): Promise<T> {
  const token = getIdToken();

  const form = new FormData();
  form.append("patient_id", String(args.patient_id));
  form.append("reportText", args.reportText ?? "");
  form.append("file", args.file);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${args.path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    throw new Error(`Cannot upload to API at ${baseUrl}${args.path}. Start backend first. ${msg}`);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `Upload failed (${res.status})`);
  return json as T;
}
