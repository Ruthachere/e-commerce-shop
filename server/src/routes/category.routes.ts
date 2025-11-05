import { Router } from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "../controllers/category.controller";
import { createCategoryDto, updateCategoryDto } from "../dto/category.dto";
import { validateRequest } from "../middlewares/validation.middleware";
import { audit } from "../middlewares/audit.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);

//Admin only
router.post(
  "/",
  authenticate(["Admin"]),
  audit("CREATE_CATEGORY", "Category"),
  createCategoryDto,
  validateRequest,
  createCategory
);
router.put(
  "/:id",
  authenticate(["Admin"]),
  audit("UPDATE_CATEGORY", "Category"),
  updateCategoryDto,
  validateRequest,
  updateCategory
);
router.delete(
  "/:id",
  authenticate(["Admin"]),
  audit("DELETE_CATEGORY", "Category"),
  deleteCategory
);

export default router;
