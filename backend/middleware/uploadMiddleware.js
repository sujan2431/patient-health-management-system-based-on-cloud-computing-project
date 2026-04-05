import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

function allowedMime(mime) {
  return mime === "application/pdf" || mime === "image/jpeg" || mime === "image/jpg";
}

export function makeReportUpload() {
  return multer({
    limits: { fileSize: MAX_FILE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!allowedMime(file.mimetype)) {
        return cb(new Error("Invalid file type. Only PDF and JPG are allowed."));
      }
      return cb(null, true);
    },
    storage: multer.diskStorage({
      async destination(req, _file, cb) {
        try {
          const patientId = req.body?.patient_id ? String(req.body.patient_id) : "unknown";
          const dest = path.join(process.cwd(), "uploads", "reports", patientId);
          await fs.mkdir(dest, { recursive: true });
          cb(null, dest);
        } catch (e) {
          cb(e);
        }
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = crypto.randomBytes(16).toString("hex");
        // Normalize jpg/pdf extensions
        const normalizedExt = ext === ".pdf" ? ".pdf" : ".jpg";
        cb(null, `${name}${normalizedExt}`);
      }
    })
  });
}

