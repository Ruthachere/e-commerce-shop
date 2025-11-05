import express from "express";
import { getOrderItems } from "../controllers/orderItems.controller";
import { authenticate } from "../middlewares/authenticate.middleware";
import { audit } from "../middlewares/audit.middleware";

const router = express.Router();

router.get(
  "/",
  authenticate(["Admin"]),
  audit("CHECK_ORDERITEMS", "OrderItems"),
  getOrderItems
);

export default router;
