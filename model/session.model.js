import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hashedRefreshToken: {
      type: String,
      required: true,
    },
    device: {
      type: String,
      default: "Unknown Device",
    },
    browser: {
      type: String,
      default: "Unknown Browser",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true },
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
