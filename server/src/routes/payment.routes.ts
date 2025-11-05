import { Router } from "express";
import {
  getAllPayments,
  updatePaymentStatus,
  getPaymentById,
  createPayment,
  createCheckoutSession,
} from "../controllers/payment.controller";
import {
  updatePaymentStatusDTO,
  getPaymentByIdDTO,
  createPaymentDTO,
} from "../dto/payment.dto";
import { validateRequest } from "../middlewares/validation.middleware";
import { audit } from "../middlewares/audit.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";

const router = Router();

// Admin only
router.get("/", getAllPayments);
router.post("/create-checkout-session", createCheckoutSession);
router.put(
  "/:id",
  // authenticate(["Admin"]),
  audit("UPDATE_PAYMENT", "Payment"),
  updatePaymentStatusDTO,
  validateRequest,
  updatePaymentStatus
);

// Public
router.get("/:id", getPaymentByIdDTO, validateRequest, getPaymentById);
router.post(
  "/",
  // authenticate(["Admin"]),
  audit("CREATE_PAYMENT", "Payment"),
  createPaymentDTO,
  validateRequest,
  createPayment
);

export default router;
