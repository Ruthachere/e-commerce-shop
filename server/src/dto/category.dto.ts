import { body, param } from 'express-validator';

export const createCategoryDto = [
  body('name').isString().withMessage('Category name must be a string').notEmpty().withMessage('Category name is required'),
];

export const updateCategoryDto = [
  param('id').isInt().withMessage('Category ID must be an integer'),
  body('name').optional().isString().withMessage('Category name must be a string'),
];
