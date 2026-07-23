import User from "../model/auth.model.js";
import jwt from "jsonwebtoken";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if(!authHeader?.startsWith("Bearer ")){
      return res.status(401).json({
        success:false,
        message: "Access token not found."
      })
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if(decoded.type !== "access"){
      return res.status(401).json({
        success: false,
        message: "Invalid access token."
      })
    }

    // if (
    //   req.headers.authorization &&
    //   req.headers.authorization.startsWith("Bearer")
    // ) {
    //   token = req.headers.authorization.split(" ")[1];
    // }
    // if (!token) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Access denied. Token not found.",
    //   });
    // }
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // if (!decoded) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Invalid token!",
    //   });
    // }    

    const user = await User.findById(decoded.userId).select("-password");

    if(!user){
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      })
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

export default protect;
