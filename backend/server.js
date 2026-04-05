import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "./config/env.js";
import { initDb } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middlewares
// NOTE: We relax CSP only in development because /register and /login demo pages
// currently use inline scripts. In production, move scripts to static files and
// enable a strict CSP policy.
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false
  })
);
app.use(
  cors({
    // For local development we allow the dev frontend origin (or all if not specified).
    // Tokens are sent via Authorization header, so cookies are not required.
    origin: env.CORS_ORIGIN || true,
    credentials: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Basic rate limiting (production should tune this)
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(morgan(env.NODE_ENV === "test" ? "tiny" : "combined"));

// Health check
app.get("/health", (_req, res) => res.json({ ok: true, service: "phms-backend" }));

// Simple HTML helpers (so users can create accounts without Postman)
app.get("/register", (_req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>PHMS Register</title>
    <style>
      body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}
      input,select,button{font-size:16px;padding:10px;border-radius:10px;border:1px solid #ccc;width:100%}
      label{display:block;margin:14px 0 6px}
      .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      pre{background:#0b1220;color:#e5e7eb;padding:12px;border-radius:12px;overflow:auto}
      .hint{opacity:.7}
    </style>
  </head>
  <body>
    <h1>PHMS - Create User</h1>
    <p class="hint">This page calls <code>POST /register</code> (JSON) on this backend.</p>
    <div class="row">
      <div>
        <label>Email</label>
        <input id="email" placeholder="patient@example.com" />
      </div>
      <div>
        <label>Role</label>
        <select id="role">
          <option>Patient</option>
          <option>Doctor</option>
          <option>Admin</option>
        </select>
      </div>
    </div>
    <label>Password</label>
    <input id="password" type="password" placeholder="PatientPass1!" />
    <label>Invite code (only needed for Doctor/Admin if enabled)</label>
    <input id="inviteCode" placeholder="(optional)" />
    <button id="btn" style="margin-top:16px">Create account</button>
    <h3>Response</h3>
    <pre id="out">{}</pre>
    <script>
      const out = document.getElementById('out');
      document.getElementById('btn').addEventListener('click', async () => {
        out.textContent = 'Loading...';
        const body = {
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
          role: document.getElementById('role').value,
          inviteCode: document.getElementById('inviteCode').value || undefined,
        };
        try {
          const res = await fetch('/register', {
            method: 'POST',
            headers: {'content-type':'application/json'},
            body: JSON.stringify(body),
          });
          const json = await res.json().catch(()=>({}));
          out.textContent = JSON.stringify(json, null, 2);
        } catch (e) {
          out.textContent = String(e);
        }
      });
    </script>
  </body>
</html>`);
});

app.get("/login", (_req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>PHMS Login</title>
    <style>
      body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}
      input,button{font-size:16px;padding:10px;border-radius:10px;border:1px solid #ccc;width:100%}
      label{display:block;margin:14px 0 6px}
      pre{background:#0b1220;color:#e5e7eb;padding:12px;border-radius:12px;overflow:auto}
      .hint{opacity:.7}
    </style>
  </head>
  <body>
    <h1>PHMS - Login</h1>
    <p class="hint">This page calls <code>POST /login</code> (JSON) on this backend.</p>
    <label>Email</label>
    <input id="email" placeholder="patient@hospital.com" />
    <label>Password</label>
    <input id="password" type="password" placeholder="Password1!" />
    <button id="btn" style="margin-top:16px">Login</button>
    <h3>Response</h3>
    <pre id="out">{}</pre>
    <script>
      const out = document.getElementById('out');
      document.getElementById('btn').addEventListener('click', async () => {
        out.textContent = 'Loading...';
        const body = {
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
        };
        try {
          const res = await fetch('/login', {
            method: 'POST',
            headers: {'content-type':'application/json'},
            body: JSON.stringify(body),
          });
          const json = await res.json().catch(()=>({}));
          out.textContent = JSON.stringify(json, null, 2);
        } catch (e) {
          out.textContent = String(e);
        }
      });
    </script>
  </body>
</html>`);
});

// Identity endpoint (frontend expects GET /me)
app.get("/me", requireAuth, (req, res) => {
  res.json({
    user: { sub: req.user.userId, email: req.user.email, role: req.user.role }
  });
});

// Routes
// Compatibility routes (frontend expects `/login`, `/me`, `/patients`, `/reports`, etc.)
app.use("/", authRoutes);
app.use("/patients", patientRoutes);
app.use("/reports", reportRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/admin", adminRoutes);

// Fallback handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Ensure upload dir exists (uploads are stored on disk)
app.locals.uploadsRoot = path.join(__dirname, "uploads");

await initDb();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PHMS backend listening on http://localhost:${env.PORT}`);
});

