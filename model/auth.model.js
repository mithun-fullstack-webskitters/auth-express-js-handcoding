import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    required: true,
    type: string,
    trim: true,
  },
  email: {
    required: true,
    type: string,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    required: true,
    type: string,
    select: false,
    minlength: 6,
  },
  resetToken: {
    type: string,
    default: null,
  },
  resetTokenExpire: {
    type: string,
    default: null,
  },
  timestamp: true,
});

const User = mongoose.model("User", userSchema);
export default User;
