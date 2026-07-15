import User from "../model/auth.model.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

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
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found!",
      });
    };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashToken;
    user.resetPasswordExpire = Date.now()  + 15 * 60 * 1000;

    await user.save();

    const resetURL = `http://localhost:5000/api/auth/reset-password/${hashToken}`;

    return res.status(200).json({
      success: true,
      message: "Reset token generated",
      resetURL
    })

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try{
    const {token} = req.params;
    const {password} = req.body;
    
    const hashToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashToken,
      resetPasswordExpire: {$gt: Date.now()}
    });

    if(!user){
      return res.status(400).json({
        success:false,
        message: "Invalid or expired token"
      })
    }

    const hashPassword = await bcrypt.hash(password, 10);

    user.password = hashPassword;
    user.resetPasswordToken =null;
    user.resetPasswordExpire = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    })
  }catch(error){
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
};

export const refreshToken = async (req, res) => {
  res.json({
    message: "Refresh token API",
  });
};

export const getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
};
