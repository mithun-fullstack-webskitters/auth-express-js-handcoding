import jwt from "jsonwebtoken";

const generateAccessToken = (userId) => {
  return jwt.sign({ userId, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE,
  });
};

export default generateAccessToken;