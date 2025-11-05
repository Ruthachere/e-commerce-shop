import { Router } from "express";
import {
  adjustInventory,
  createInventory,
  getAllInventory,
  getInventoryById,
  getLowStockVariants,
  searchInventory,
  updateInventory,
} from "../controllers/inventory.controller";
import {
  createInventoryDTO,
  updateInventoryDTO,
  getInventoryByIdDTO,
  adjustInventoryDto,
} from "../dto/inventory.dto";
import { validateRequest } from "../middlewares/validation.middleware";
import { audit } from "../middlewares/audit.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";

const router = Router();
// Public
router.get("/", getAllInventory);
router.get("/search", searchInventory);
router.get("/:id", getInventoryByIdDTO, validateRequest, getInventoryById);

// Admin only
router.get(
  "/low-stock",
  authenticate(["Admin"]),
  audit("CHECK_INVENTORY", "Inventory"),
  getLowStockVariants
);
router.patch(
  "/adjust/:variantId",
  authenticate(["Admin"]),
  audit("ADJUST_INVENTORY", "Inventory"),
  adjustInventoryDto,
  validateRequest,
  adjustInventory
);
router.post(
  "/",
  authenticate(["Admin"]),
  audit("CREATE_INVENTORY", "Inventory"),
  createInventoryDTO,
  validateRequest,
  createInventory
);
router.put(
  "/:id",
  authenticate(["Admin"]),
  audit("UPDATE_INVENTORY", "Inventory"),
  updateInventoryDTO,
  validateRequest,
  updateInventory
);

export default router;
