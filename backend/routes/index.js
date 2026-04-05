import { Router } from "express";

import authRoutes from "./authRoutes.js";
import patientRoutes from "./patientRoutes.js";
import reportRoutes from "./reportRoutes.js";
import appointmentRoutes from "./appointmentRoutes.js";
import adminRoutes from "./adminRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/patients", patientRoutes);
router.use("/reports", reportRoutes);
router.use("/appointments", appointmentRoutes);

router.use("/admin", adminRoutes);

export default router;

