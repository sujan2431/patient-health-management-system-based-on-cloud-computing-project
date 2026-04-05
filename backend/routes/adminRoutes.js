import express from "express";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/rbac.js";

import { adminListUsers, adminListAuditLogs, adminUpdateUserRole } from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", requireAuth, requireRole("Admin"), asyncHandler(adminListUsers));
router.get("/audit-logs", requireAuth, requireRole("Admin"), asyncHandler(adminListAuditLogs));
router.patch("/users/:id/role", requireAuth, requireRole("Admin"), asyncHandler(adminUpdateUserRole));

export default router;

