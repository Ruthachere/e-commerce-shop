import { isEmail } from "class-validator";
import { body } from "express-validator";



export const registerDTO = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3, max: 20 }).withMessage("Username must be 3-20 characters"),

  body("email")
    .normalizeEmail()
    .isEmail().withMessage("Invalid email format"),

  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain a lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain a number"),

  body("firstName")
    .trim()
    .notEmpty().withMessage("First name is required"),

  body("lastName")
    .trim()
    .notEmpty().withMessage("Last name is required"),

  body("phoneNumber")
    .trim()
    .isMobilePhone("any").withMessage("Invalid phone number"),

  body("role")
    .optional()
    .isIn(["Basic", "Admin"]).withMessage("Invalid role"),
];


export const loginDTO = [
  body("email")
    .isEmail().withMessage("Email must be valid")
    .normalizeEmail(),

  body("password")
    .isString().notEmpty().withMessage("Password is required"),
];
