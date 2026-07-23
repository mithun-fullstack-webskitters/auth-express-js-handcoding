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

const router = express.Router();

router.post("/signup", signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);
router.get("/get-profile", protect, getProfile);
router.post("/forget-password", forgetPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/logout-all",protect, logoutAll);
router.get("/sessions",protect, getSessions);
router.delete("/sessions/:sessionId",protect, revokeSession);

export default router;