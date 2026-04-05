import express from "express";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/rbac.js";

import { uploadReport, getReport, listReports, downloadReport } from "../controllers/reportController.js";
import { makeReportUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();
const upload = makeReportUpload();

router.post("/upload", requireAuth, requireRole("Doctor", "Admin"), upload.single("file"), asyncHandler(uploadReport));
router.get("/", requireAuth, requireRole("Doctor", "Admin", "Patient"), asyncHandler(listReports));
router.get("/:id", requireAuth, requireRole("Doctor", "Admin", "Patient"), asyncHandler(getReport));
router.get("/:id/download", requireAuth, requireRole("Doctor", "Admin", "Patient"), asyncHandler(downloadReport));

export default router;

