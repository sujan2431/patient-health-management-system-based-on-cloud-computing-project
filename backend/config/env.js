import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DB_CLIENT: z.enum(["sqlite", "mysql"]).default("sqlite"),
  DB_FILE: z.string().default("./data/phms.sqlite"),

  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // For safer registration of privileged roles
  INVITE_CODE: z.string().min(1).optional(),

  // OpenAI summary
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  // CORS
  CORS_ORIGIN: z.string().optional(),

  // Patient portal URL included in link SMS (and similar notifications)
  PATIENT_PORTAL_URL: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.string().url().optional()
  ),

  // Twilio — optional; without these, SMS is logged only (mock)
  TWILIO_ACCOUNT_SID: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.string().min(1).optional()
  ),
  TWILIO_AUTH_TOKEN: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.string().min(1).optional()
  ),
  TWILIO_PHONE_NUMBER: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.string().min(1).optional()
  )
});

export const env = (() => {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${issues.join("\n")}`);
  }
  return parsed.data;
})();

