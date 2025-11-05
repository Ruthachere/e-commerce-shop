import express from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  searchOrders,
} from "../controllers/order.controller";

import { createOrderDTO, updateOrderStatusDTO } from "../dto/order.dto";
import { validateRequest } from "../middlewares/validation.middleware";
import calculatePricing from "../middlewares/calculate.middleware";
import { audit } from "../middlewares/audit.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";

const router = express.Router();

router.get("/", getOrders);
router.get("/:id", getOrderById);

router.post(
  "/",
  authenticate(["Basic"]),
  audit("CREATE_ORDER", "Order"),
  createOrderDTO,
  validateRequest,
  calculatePricing,
  createOrder
);
router.put(
  "/:id",
  authenticate(["Admin"]),
  audit("UPDATE_ORDER", "Order"),
  updateOrderStatusDTO,
  validateRequest,
  updateOrderStatus
);
router.delete(
  "/:id",
  authenticate(["Admin"]),
  audit("DELETE_ORDER", "Order"),
  cancelOrder
);
router.get("/searchs", searchOrders);

export default router;
