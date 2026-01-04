import { Request, Response } from "express";
import { stripe } from "../utils/stripe";
import { prisma } from "../utils/prisma";
import Stripe from "stripe";
import { paymentQueue } from "../queues/order.queue";
// ✅ ensure correct queue file

export const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("✅ Stripe webhook hit");

  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const orderId = parseInt(session.metadata?.orderId || "0");
    const email = session.customer_details?.email;
    const amount = (session.amount_total ?? 0) / 100;
    const paymentId = session.payment_intent?.toString() || "PAY-" + Date.now();

    if (!orderId || !email) {
      console.error("❌ Missing required info: orderId or email");
      return res.status(400).json({ error: "Missing orderId or email" });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            orderId,
            paymentDate: new Date(),
            paymentMethod: session.payment_method_types[0],
            amount,
            status: "Completed",
            // transactionId: paymentId,
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: { status: "Shipped" },
        });
      });

      console.log(`✅ Payment saved & order #${orderId} marked as Paid`);

      // ✅ Queue after successful DB commit
      await paymentQueue.add("sendPaymentConfirmation", {
        userEmail: email,
        paymentId,
        amount,
      });
    } catch (err: any) {
      console.error("❌ DB update failed:", err);
      return res.status(500).json({ error: "DB update failed" });
    }
  }

  return res.status(200).json({ received: true });
};
