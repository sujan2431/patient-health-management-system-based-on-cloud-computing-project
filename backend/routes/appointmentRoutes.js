import express from "express";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/rbac.js";

import {
  bookAppointment,
  decisionAppointment,
  listAppointments,
  listDoctorsForBooking
} from "../controllers/appointmentController.js";

const router = express.Router();

router.get("/doctors", requireAuth, requireRole("Patient"), asyncHandler(listDoctorsForBooking));
router.post("/", requireAuth, requireRole("Patient"), asyncHandler(bookAppointment));
router.get("/", requireAuth, requireRole("Doctor", "Admin", "Patient"), asyncHandler(listAppointments));
router.post("/:id/decision", requireAuth, requireRole("Doctor"), asyncHandler(decisionAppointment));

export default router;

