import { body, param } from "express-validator";

// POST /inventory
export const createInventoryDTO = [
  body("productId")
    .isInt({ gt: 0 })
    .withMessage("Product ID must be a positive integer"),

  body("quantity")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),
];

// PUT /inventory/:id
export const updateInventoryDTO = [
  param("id")
    .isInt({ gt: 0 })
    .withMessage("Inventory ID must be a positive integer"),

  param('variantId').isInt().withMessage('Variant ID must be an integer'),
  body("quantity")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),
      body("minStockLevel").isInt({ min: 0 }).withMessage("Minimum stock level cannot be negative")
];

// GET /inventory/:id
export const getInventoryByIdDTO = [
  param("id")
    .isInt({ gt: 0 })
    .withMessage("Inventory ID must be a positive integer"),
];

export const adjustInventoryDto = [
  param('variantId').isInt(),
  body('adjustment').isInt().withMessage('Adjustment must be an integer (positive or negative)'),
];