import express from "express";
import {
  forgetPassword,
  getProfile,
  login,
  refreshToken,
  resetPassword,
  signup,
} from "../controller/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/get-profile", getProfile);
router.post("/forget-password", forgetPassword);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/reset-password", resetPassword);

export default router;
