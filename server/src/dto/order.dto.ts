import { body } from "express-validator";

export const createOrderDTO = [
  body("userId").isInt().withMessage("User ID must be an integer"),
  body("shippingCity").notEmpty().withMessage("Shipping city is required"),
  body("shippingState").notEmpty().withMessage("Shipping state is required"),
  body("shippingCountry")
    .notEmpty()
    .withMessage("Shipping country is required"),
  body("shippingMethod")
    .isIn(["Standard", "Express", "Overnight"])
    .withMessage("Invalid shipping method"),
  body("orderItems")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item"),
  body("orderItems.*.productId")
    .isInt({ min: 1 })
    .withMessage("Invalid productId"),
  body("orderItems.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("orderItems.*.price")
    .isFloat({ min: 0 })
    .withMessage("Invalid item price"),
];

export const updateOrderStatusDTO = [
  body("status").isIn(["Pending", "Shipped", "Delivered", "Cancelled"]),
];
