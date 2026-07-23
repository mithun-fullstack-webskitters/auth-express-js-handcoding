import express from "express";
import {
  forgetPassword,
  getProfile,
  getSessions,
  login,
  logout,
  logoutAll,
  refreshToken,
  resetPassword,
  revokeSession,
  signup,
} from "../controller/auth.controller.js";

import {
  signupValidation,
  loginValidation,
  validate,
} from "../middleware/validate.middleware.js";
import protect from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/signup",authLimiter, signupValidation, validate, signup);
router.post("/login",authLimiter, loginValidation, validate, login);
router.get("/get-profile", protect, getProfile);
router.post("/forget-password",authLimiter, forgetPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh-token",authLimiter, refreshToken);
router.post("/logout", logout);
router.post("/logout-all",protect, logoutAll);
router.get("/sessions",protect, getSessions);
router.delete("/sessions/:sessionId",protect, revokeSession);

export default router;