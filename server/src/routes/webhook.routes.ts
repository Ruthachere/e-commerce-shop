import { Router } from "express";
import { stripeWebhook } from "../controllers/webhook.controller";
import bodyParser from "body-parser";
const router = Router();

// Stripe requires raw body for webhook
router.post(
  "/stripe",
  bodyParser.raw({ type: "application/json" }),
  stripeWebhook
);

export default router;
