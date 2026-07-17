import jwt from "jsonwebtoken";

const generateToken = async (userId) => {
  return jwt.sign({ userId, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE,
  });
};

export default generateToken;
