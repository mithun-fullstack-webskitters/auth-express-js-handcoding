import jwt from "jsonwebtoken";

const generateToken = async (id) => {
  const accessToken = jwt.sign({ id, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE,
  });
  const refreshToken = jwt.sign({ id, type: "refresh" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE,
  });
  return {
    accessToken,
    refreshToken,
  };
};

export default generateToken;
