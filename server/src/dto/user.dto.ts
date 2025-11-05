import { body } from "express-validator";

export const updateUserProfileDto = [
  body("username").optional().isString(),
  body("email").optional().isEmail(),
  body("phoneNumber").optional().isNumeric().isLength({ min: 8, max: 10 }),
  body("firstName").optional().isString(),
  body("LastName").optional().isString(),
];
