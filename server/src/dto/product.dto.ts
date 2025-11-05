import { body, param } from "express-validator";

export const createProductDTO = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("description").optional().trim(),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("categoryId").isInt().withMessage("Category ID must be an integer"),
  // body("variants")
  //   .optional()
  //   .isArray()
  //   .withMessage("Variants must be an array"),
  // body("variants.*.name").notEmpty().withMessage("Variant name is required"),
  // body("variants.*.price").isFloat({ min: 0 }).withMessage("Variant price must be a positive number"),
  // body("variants.*.sku").optional().trim(),
  body("inStock").isBoolean().withMessage("inStock must be a boolean"),
];

export const updateProductDTO = [
  param('id').isInt(),
  body('name').optional().isString(),
  body('description').optional().isString(),
  body('price').optional().isDecimal(),
  body('imageurl').optional().isString(),
  body('categoryId').optional().isInt(),
  body("inStock").optional().isBoolean(),
];
