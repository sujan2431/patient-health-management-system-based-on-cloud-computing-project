import http from "node:http";
import { config as loadDotenv } from "dotenv";
import { json, notFound, serverError } from "../http.js";
import type { ApiEvent } from "../types.js";
import { handler as me } from "../handlers/me.js";
import { handler as patients } from "../handlers/patients.js";
import { handler as reports } from "../handlers/reports.js";
import { handler as patientLink } from "../handlers/patientLink.js";
import { handler as login } from "../handlers/login.js";

loadDotenv();

const port = Number(process.env.PORT ?? 4000);

async function readBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks).toString("utf8");
}

function toEvent(req: http.IncomingMessage, body: string | null): ApiEvent {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers[k] = v;
    else if (Array.isArray(v)) headers[k] = v.join(",");
  }
  const query: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) query[k] = v;

  return {
    httpMethod: req.method ?? "GET",
    path: url.pathname,
    headers,
    queryStringParameters: Object.keys(query).length ? query : null,
    body
  };
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type"
};

async function route(event: ApiEvent) {
  if (event.path === "/login") return login(event);
  if (event.path === "/me") return me(event);
  if (event.path === "/patients/link-user") return patientLink(event);
  if (event.path === "/patients" || event.path.startsWith("/patients/")) return patients(event);
  if (event.path === "/reports" || event.path.startsWith("/reports/")) return reports(event);
  
  if (event.httpMethod === "PUT" && event.path.startsWith("/mock-s3-upload")) {
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: true }) };
  }
  if (event.httpMethod === "GET" && event.path.startsWith("/mock-s3-download")) {
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "Mock file download content" }) };
  }
  
  return notFound();
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  try {
    const body = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" ? await readBody(req) : null;
    const event = toEvent(req, body);
    const out = await route(event);
    res.statusCode = out.statusCode;
    for (const [k, v] of Object.entries({ ...CORS_HEADERS, ...(out.headers ?? {}) })) res.setHeader(k, v);
    res.end(out.body);
  } catch (e) {
    const out = serverError(e instanceof Error ? e.message : "Server error");
    res.statusCode = out.statusCode;
    for (const [k, v] of Object.entries({ ...CORS_HEADERS, ...(out.headers ?? {}) })) res.setHeader(k, v);
    res.end(out.body);
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend dev server listening on http://localhost:${port}`);
});

