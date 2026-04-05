import express from "express";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createPatientHandler,
  getPatientByIdHandler,
  linkPatientToUserHandler,
  listPatientsHandler
} from "../controllers/patientController.js";

const router = express.Router();

router.post("/", requireAuth, requireRole("Doctor", "Admin"), asyncHandler(createPatientHandler));
router.get("/", requireAuth, requireRole("Doctor", "Admin", "Patient"), asyncHandler(listPatientsHandler));
router.get("/:id", requireAuth, requireRole("Doctor", "Admin", "Patient"), asyncHandler(getPatientByIdHandler));
router.post("/:id/link", requireAuth, requireRole("Doctor", "Admin"), asyncHandler(linkPatientToUserHandler));

export default router;

