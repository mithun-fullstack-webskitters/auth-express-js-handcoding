import User from "../model/auth.model.js";
import jwt from "jsonwebtoken";

const protect = (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startswith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    console.log(token, "token");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Toke not found.",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) {
      return res.status(401).json({
        success: false,
        message: "Invalid token!",
      });
    }
    const user = User.findById(decoded.id).select("-password");
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default protect;
