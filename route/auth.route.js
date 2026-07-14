import express from "express";
import {
  forgetPassword,
  getProfile,
  login,
  refreshToken,
  resetPassword,
  signup,
} from "../controller/auth.controller.js";

import {
  signupValidation,
  loginValidation,
  validate,
} from "../middleware/validate.middleware.js";

const router = express.Router();

router.post("/signup", signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);
router.post("/get-profile", getProfile);
router.post("/forget-password", forgetPassword);
router.post("/refresh-token", refreshToken);
router.post("/reset-password", resetPassword);

export default router;
