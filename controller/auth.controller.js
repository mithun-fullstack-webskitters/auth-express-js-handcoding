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
import generateAccessToken from "../utils/generateAccessToken.js";
import createSession from "../utils/createSession.js";
import deviceInfo from "../utils/findDevice.js";


export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const userExist = await User.findOne({ email });

  if (userExist) {
    throw new AppError("User already exist", 409);
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashPassword,
    role
  });

  // const { accessToken, refreshToken } = await generateToken(user._id);
  const accessToken = generateAccessToke(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const deviceInfoResult = deviceInfo(req);


  // pass raw refresh token; createSession will hash it before saving
  createSession(user._id, refreshToken, deviceInfoResult.device.type || "Desktop", deviceInfoResult.browser.name, req.ip);

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

  // await Session.create({
  //   user: user._id,
  //   hashedRefreshToken,
  //   expiresAt: new Date(
  //     Date.now() + REFRESH_COOKIE_MAX_AGE
  //   )
  // });
  const deviceInfoResult = deviceInfo(req);


  // pass raw refresh token so createSession hashes it once
  createSession(user._id, refreshToken, deviceInfoResult.device.type || "Desktop", deviceInfoResult.browser.name, req.ip);
  // createSession(user._id, hashedRefreshToken);

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

  const hashedToken = hashToken(resetToken);

  user.resetPasswordToken = hashedToken;
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

  const hashedRefreshToken = hashToken(refreshToken);

  const session = await Session.findOne({
    hashedRefreshToken,
    isRevoked: false
  }).populate("user");  
  

  if(!session){
    throw new AppError("Session expired", 401);
  };


  if (!session?.user) {
    throw new AppError("User not found", 401);
}

  const newAccessToken = generateAccessToken(session.user._id);
  const newRefreshToken = generateRefreshToken(session.user._id);

  const newHashedToken = hashToken(newRefreshToken);

  // create session using raw token; createSession will hash it
  const deviceInfoResult = deviceInfo(req);

  createSession(session.user._id, newRefreshToken, deviceInfoResult.device.type || "Desktop", deviceInfoResult.browser.name, req.ip);
  // createSession(user._id, hashedRefreshToken, );
  
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

export const logout = asyncHandler(async (req,res)=>{
  const {refreshToken} = req.cookies;

  if(refreshToken){
    const hashedToken = hashToken(refreshToken);

    await Session.findOneAndDelete({
      hashedRefreshToken: hashedToken
    })
  };

  res.clearCookie("refreshToken", cookieOptions);

  return sendResponse(res, 200, "Logged out successfully!")
});

export const logoutAll = asyncHandler(async(req, res)=>{
    await Session.deleteMany({
      user: req.user._id// we have make this as a mongoose.Schema.Types.ObjectId in our schema file
    });

    res.clearCookie("refreshToken", cookieOptions);

    return sendResponse(res,200,"Logout from all devices")
});

export const getSessions = asyncHandler(async(req,res)=>{
  const sessions = await Session.find({
    user: req.user._id,
  }).select("-hashedRefreshToken");

  

  return sendResponse(res, 200, "Sessions fetched", sessions)
});

//Logout one device
export const revokeSession = asyncHandler(async (req, res) => {
  const {sessionId} = req.params;
  const session = await Session.findOne({
    _id: sessionId,
    user: req.user._id
  });

  if(!session){
    throw new AppError("Session not found!", 404);
  };

  await session.deleteOne();

  return sendResponse(res, 200, "Session revoked");
})