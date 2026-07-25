import { body, validationResult } from "express-validator";

export const signupValidation = [
  body("name").trim().notEmpty().withMessage("Name is required!"),
  body("email").trim().isEmail().withMessage("Enter a valid email!"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["user", "admin", "manager", "moderator"])
    .withMessage("Invalid role"),
];

export const loginValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email!"),
  body("password").notEmpty().withMessage("Password is required!"),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};
