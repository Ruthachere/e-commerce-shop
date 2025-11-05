import { body, param } from 'express-validator';

export const createVariantDto = [
  body('sku').isString().notEmpty(),
  body('color').optional().isString(),
  body('size').optional().isString(),
  body('price').isDecimal(),
  body('productId').isInt(),
  body('inventoryQuantity').optional().isInt({ min: 0 }),
];

export const updateVariantDto = [
  param('id').isInt(),
  body('sku').optional().isString(),
  body('color').optional().isString(),
  body('size').optional().isString(),
  body('price').optional().isDecimal(),
  body('inventoryQuantity').optional().isInt({ min: 0 }),
];
