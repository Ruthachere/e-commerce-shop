import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsWithoutVariants,
} from "../controllers/product.controller";
import { createProductDTO, updateProductDTO } from "../dto/product.dto";
import { validateRequest } from "../middlewares/validation.middleware";
import { audit } from "../middlewares/audit.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";
import { searchProducts } from "../controllers/product.controller";
import { upload } from "../utils/multer";

const router = express.Router();

router.get("/", getProducts);
router.get("/without-variants", getProductsWithoutVariants);
router.get("/search", searchProducts);
router.get("/:id", getProductById);

//Admin Only
router.post(
  "/",
  authenticate(["Admin"]),
  audit("CREATE_PRODUCT", "Product"),
  upload.single("image"),
  createProductDTO,
  validateRequest,
  createProduct
);
router.put(
  "/:id",
  authenticate(["Admin"]),
  audit("UPDATE_PRODUCT", "Product"),
  upload.single("image"),
  updateProductDTO,
  validateRequest,
  updateProduct
);
router.delete(
  "/:id",
  authenticate(["Admin"]),
  audit("DELETE_PRODUCT", "Product"),
  deleteProduct
);

export default router;
