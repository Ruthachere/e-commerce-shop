import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { stripe } from "../utils/stripe";
import { logger } from "../utils/logger";
import { paymentQueue } from "../queues/order.queue";

//  Map payment → order status
const paymentToOrderStatus: Record<string, string> = {
  Completed: "Pending", // Order ready for fulfillment
  Failed: "Cancelled",
  Pending: "Pending",
};

// ================================================
// ✅ GET /payments
// ================================================
export const getAllPayments = async (_req: Request, res: Response) => {
  console.log("📡 GET /payments request received");
  try {
    const payments = await prisma.payment.findMany({
      include: { order: true },
    });

    logger.info("Fetched all payments", { count: payments.length });
    return res.status(200).json(payments);
  } catch (error: any) {
    console.error("❌ Failed to fetch payments:", error);
    logger.error("Error fetching payments", { error: error.stack });
    return res.status(500).json({ error: "Failed to fetch payments" });
  }
};

// ================================================
// ✅ GET /payments/:id
// ================================================
export const getPaymentById = async (req: Request, res: Response) => {
  console.log("📡 GET /payments/:id request received", { id: req.params.id });

  try {
    const id = parseInt(req.params.id);
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      console.error("❌ Payment not found:", id);
      return res.status(404).json({ message: "Payment not found" });
    }

    logger.info("Fetched payment by ID", { id });
    return res.status(200).json(payment);
  } catch (error: any) {
    console.error("❌ Failed to fetch payment:", error);
    logger.error("Error fetching payment", {
      id: req.params.id,
      error: error.stack,
    });
    return res.status(500).json({ error: "Failed to fetch payment" });
  }
};

// ================================================
// ✅ POST /payments
// ================================================
export const createPayment = async (req: Request, res: Response) => {
  console.log(" POST /payments request received:", req.body);
  const { orderId, paymentMethod, amount } = req.body;

  try {
    if (!orderId || !paymentMethod || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await prisma.payment.findUnique({ where: { orderId } });
    if (existing) {
      console.error(" Payment already exists for order:", orderId);
      return res
        .status(400)
        .json({ message: "Payment for this order already exists" });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        paymentMethod,
        amount,
        paymentDate: new Date(),
      },
    });

    logger.info("✅ Payment created", { orderId, paymentMethod, amount });
    return res.status(201).json(payment);
  } catch (error: any) {
    console.error("❌ Failed to create payment:", error);
    logger.error("Error creating payment", {
      orderId,
      error: error.stack,
    });
    return res.status(500).json({ error: "Failed to create payment" });
  }
};

// ================================================
// ✅ PUT /payments/:id (update status + order status)
// ================================================
export const updatePaymentStatus = async (req: Request, res: Response) => {
  console.log(
    "♻️ PUT /payments/:id request received:",
    req.params.id,
    req.body
  );
  const paymentId = parseInt(req.params.id);
  const { status } = req.body;

  try {
    if (!["Pending", "Completed", "Failed"].includes(status)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status },
      include: { order: true },
    });

    const newOrderStatus = paymentToOrderStatus[status];
    const updatedOrder = await prisma.order.update({
      where: { id: updatedPayment.orderId },
      data: { status: newOrderStatus as any },
    });

    logger.info("✅ Payment and order status updated", {
      paymentId,
      newPaymentStatus: status,
      newOrderStatus,
    });

    return res.status(200).json({
      message: "Payment and order status updated successfully",
      payment: updatedPayment,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("❌ Failed to update payment status:", error);
    logger.error("Error updating payment status", {
      paymentId,
      error: error.stack,
    });
    return res
      .status(500)
      .json({ error: "Failed to update payment and order status" });
  }
};

// ================================================
// ✅ POST /payments/create-checkout-session
// ================================================
export const createCheckoutSession = async (req: Request, res: Response) => {
  console.log("💳 Stripe checkout session request received");
  console.log("Request body:", req.body);

  try {
    const { orderId} = req.body;
    // const paymentId = "PAY-" + Date.now();

    if (!orderId) {
      console.error("❌ Missing orderId");
      return res.status(400).json({ error: "Order ID is required" });
    }

    console.log("🔍 Fetching order:", orderId);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { product: true, variant: true } },
        payment: true,
      },
    });

    if (!order) {
      console.error(" Order not found:", orderId);
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.payment) {
      console.error(" Order already paid");
      return res.status(400).json({ error: "Order already paid" });
    }

    if (order.orderItems.length === 0) {
      console.error("Order has no items");
      return res.status(400).json({ error: "Order has no items" });
    }

    console.log(" Creating line items for Stripe...");
    const lineItems = order.orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product.name,
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    console.log(" Creating Stripe session...");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/customer/success`,
      cancel_url: `${process.env.FRONTEND_URL}/customer/cancel`,
      metadata: { orderId: order.id.toString() },
    });

    logger.info(" Stripe checkout session created", {
      orderId,
      sessionId: session.id,
      url: session.url,
    });
    // await paymentQueue.add("sendPaymentConfirmation", {
    //   userEmail: email,
    //   paymentId,
    //   amount,
    // });
    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error(" Stripe session error:", error);
    logger.error("Stripe checkout session failed", {
      orderId: req.body.orderId,
      error: error.stack,
      errorType: error.type,
      errorCode: error.code,
    });

    return res.status(500).json({
      error: "Could not initiate payment. Please try again later.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
