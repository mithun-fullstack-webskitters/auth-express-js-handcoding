import User from "../model/auth.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken"
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import hashToken from "../utils/hashToken.js";
import Session from "../model/session.model.js"
import generateAccessToke from "../utils/generateAccessToken.js"
import generateRefreshToken from "../utils/generateRefreshToken.js"
import cookieOptions from "../utils/cookieOptions.js";
import { REFRESH_COOKIE_MAX_AGE } from "../utils/utils.js";
import generateAccessToken from "../utils/generateAccessToken.js";


export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const userExist = await User.findOne({ email });

  if (userExist) {
    throw new AppError("User already exist", 409);
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashPassword,
  });

  // const { accessToken, refreshToken } = await generateToken(user._id);
  const accessToken = generateAccessToke(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const hashedRefreshedToken = hashToken(user._id);

  Session.create({
    user: user._id,
    hashedRefreshedToken,
    expiresAt: new Date(
      Date.now() + REFRESH_COOKIE_MAX_AGE
    )
  });

  res.cookie("refreshToken", refreshToken, cookieOptions);

  return sendResponse(res, 201, "User registered successfully!", {
    accessToken,
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
    throw new AppError("Invalid email or Password!", 401);
  }

  const isMatch = bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const accessToken = generateAccessToke(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const hashedRefreshedToken = hashToken(refreshToken);

  await Session.create({
    user: user._id,
    hashedRefreshedToken,
    expiresAt: new Date(
      Date.now() + REFRESH_COOKIE_MAX_AGE
    )
  });

  res.cookie("refreshToken", refreshToken, cookieOptions);

  return sendResponse(res, 200, "Login Successfully!", {
    accessToken,
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
    throw new AppError("User not found!", 400);
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashToken = hashToken(resetToken);

  user.resetPasswordToken = hashToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  await user.save();

  const resetURL = `http://localhost:5000/api/auth/reset-password/${resetToken}`;

  return sendResponse(res, 200, "Reset token generated", { resetURL });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashToken = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError("Invalid or expired token", 400);
  }

  const hashPassword = await bcrypt.hash(password, 10);

  user.password = hashPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;

  await user.save();
  return sendResponse(res, 200, "Password reset successfully");
});

export const getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
};

export const refreshToken = async (req, res) => {
  const {refreshToken} = req.cookies;

  if(!refreshToken){
    throw new AppError("Refresh token missing", 401);
  }

  const decode = jwt.verify(refreshToken, process.env.JWT_SECRET);

  if(decode.type !== "refresh"){
    throw new AppError("Invalid token type", 401);
  };

  const hashedRefreshedToken = hashToken(refreshToken);

  // console.log("Incoming hash:", hashedRefreshedToken);

const sessions = await Session.find();

console.log(
  sessions.map((s) => ({
    id: s._id,
    hashedRefreshedToken: s.hashedRefreshedToken,
    expiresAt: s.expiresAt,
    isRevoked: s.isRevoked,
  }))
);

  const session = await Session.findOne({
    hashedRefreshedToken,
    isRevoked: false
  }).populate("user");

  // console.log('session', session,refreshToken, "++", hashedRefreshedToken);
  

  if(!session){
    throw new AppError("Session expired", 401);
  };


  if (!session?.user) {
    throw new AppError("User not found", 401);
}

  const newAccessToken = generateAccessToken(session.user._id);
  const newRefreshToken = generateRefreshToken(session.user._id);

  const newHashedToken = hashToken(newRefreshToken);

  await Session.create({
    user:session.user._id,
    hashedRefreshedToken:newHashedToken,
    expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE)
  });

  console.log('newAccessToken', newAccessToken, newRefreshToken);
  

  res.cookie("refreshToken", newRefreshToken, cookieOptions);

  return sendResponse(
    res,
    200,
    "Token Refreshed",
    {
      accessToken: newAccessToken
    }
  )
};
