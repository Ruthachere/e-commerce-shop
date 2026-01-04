import { body, param } from "express-validator";

// POST /payments
export const createPaymentDTO = [
  body("orderId")
    .isInt({ gt: 0 })
    .withMessage("Order ID must be a positive integer"),

  body("paymentMethod")
    .isString()
    .notEmpty()
    .withMessage("Payment method is required"),

  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than 0"),
];

// PUT /payments/:id (admin only)
export const updatePaymentStatusDTO = [
  param("id")
    .isInt({ gt: 0 })
    .withMessage("Payment ID must be a positive integer"),

  body("status")
    .isIn(["Pending", "Completed", "Failed"])
    .withMessage("Status must be one of: Pending, Completed, Failed"),
];

// GET /payments/:id
export const getPaymentByIdDTO = [
  param("id")
    .isInt({ gt: 0 })
    .withMessage("Payment ID must be a positive integer"),
];
