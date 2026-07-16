import User from "../model/auth.model.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import sendResponse from "../utils/sendResponse.js";

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const userExist = await User.findOne({ email });

  if (userExist) {
    // return res.status(409).json({
    //   success: false,
    //   message: "User already exist",
    // });
    throw new AppError("User already exist", 409);
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashPassword,
  });

  const { accessToken, refreshToken } = await generateToken(user._id);

  // return res.status(201).json({
  //   success: true,
  //   message: "User registered successfully!",
  //   accessToken,
  //   refreshToken,
  //   data: {
  //     id: user._id,
  //     name,
  //     email,
  //   },
  // });

  return sendResponse(res, 201, "User registered successfully!", {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    // return res.status(401).json({
    //   success: false,
    //   message: "Invalid email or password!",
    // });
    throw new AppError("Invalid email or Password!", 401);
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    // return res.status(401).json({
    //   success: false,
    //   message: "Invalid email or password!",
    // });
    throw new AppError("Invalid email or password!", 401);
  }

  const { accessToken, refreshToken } = await generateToken(user._id);

  // return res.status(200).json({
  //   success: true,
  //   message: "Login successfully!",
  //   accessToken,
  //   refreshToken,
  //   data: {
  //     id: user._id,
  //     name: user.name,
  //     email: user.email,
  //   },
  // });
  return sendResponse(res, 200, "Login Successfully!", {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

export const forgetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    // return res.status(400).json({
    //   success: false,
    //   message: "User not found!",
    // });
    throw new AppError("User not found!", 400);
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  await user.save();

  const resetURL = `http://localhost:5000/api/auth/reset-password/${resetToken}`;

  // return res.status(200).json({
  //   success: true,
  //   message: "Reset token generated",
  //   resetURL,
  // });

  return sendResponse(res, 200, "Reset token generated", { resetURL });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    // return res.status(400).json({
    //   success: false,
    //   message: "Invalid or expired token",
    // });
    throw new AppError("Invalid or expired token", 400);
  }

  const hashPassword = await bcrypt.hash(password, 10);

  user.password = hashPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;

  await user.save();

  // return res.status(200).json({
  //   success: true,
  //   message: "Password reset successfully",
  // });
  return sendResponse(res, 200, "Password reset successfully");
});

export const getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
};

export const refreshToken = async (req, res) => {
  res.json({
    message: "Refresh token API",
  });
};
