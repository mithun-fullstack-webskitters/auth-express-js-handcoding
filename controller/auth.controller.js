import User from "../model/auth.model.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExist = await User.findOne({ email });

    if (userExist) {
      return res.status(409).json({
        success: false,
        message: "User already exist",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashPassword,
    });

    const { accessToken, refreshToken } = await generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "User registered successfully!",
      accessToken,
      refreshToken,
      data: {
        id: user._id,
        name,
        email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password!",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password!",
      });
    }

    const { accessToken, refreshToken } = await generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successfully!",
      accessToken,
      refreshToken,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const forgetPassword = async (req, res) => {
  // try {
  //   const { email } = req.body;
  //   const user = await User.findOne({ email });
  //   if (!user) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "User not found!",
  //     });
  //   }
  //   const token = cryptop
  // } catch (err) {
  //   return res.status(401).json({
  //     success: false,
  //     message: error.message,
  //   });
  // }
};

export const refreshToken = async (req, res) => {
  res.json({
    message: "Refresh token API",
  });
};

export const resetPassword = async (req, res) => {
  res.json({
    message: "Reset Password API",
  });
};

export const getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
};
