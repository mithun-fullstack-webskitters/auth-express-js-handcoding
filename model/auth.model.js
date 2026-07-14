import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      required: true,
      type: String,
      trim: true,
    },
    email: {
      required: true,
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      required: true,
      type: String,
      select: false,
      minlength: 6,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpire: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;
