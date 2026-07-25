import AppError from "../utils/AppError.js";

const authorize =(...role)=>{
    return (req,res,next)=>{
        if(!role.includes(req.user.role)){
            return next(new AppError("Forbidden", 403));
        }
        next();
    }
};

export default authorize;