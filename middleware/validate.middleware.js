import { body, validationResult } from "express-validator";

export const signupValidation = [
  body("name").trim().notEmpty().withMessage("Name is required!"),
  body("email").trim().isEmail().withMessage("Enter a valid email!"),
  body("password").isLength({ min: 6 }).withMessage("Password is required"),
];

export const loginValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email!"),
  body("password").notEmpty().withMessage("Password is required!"),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status("400").json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};
