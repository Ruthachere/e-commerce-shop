import { Router } from "express";
import {
  createVariant,
  getVariants,
  updateVariant,
  deleteVariant,
} from "../controllers/variant.controller";
import { createVariantDto, updateVariantDto } from "../dto/variant.dto";
import { validateRequest } from "../middlewares/validation.middleware";
import { audit } from "../middlewares/audit.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";

const router = Router();
router.get("/", getVariants);
router.post(
  "/",
  authenticate(["Admin"]),
  audit("CREATE_VARIANT", "Variant"),
  createVariantDto,
  validateRequest,
  createVariant
);

router.put(
  "/:id",
  authenticate(["Admin"]),
  audit("UPDATE_VARIANT", "Variant"),
  updateVariantDto,
  validateRequest,
  updateVariant
);
router.delete(
  "/:id",
  authenticate(["Admin"]),
  audit("DELETE_VARIANT", "Variant"),
  deleteVariant
);

export default router;
