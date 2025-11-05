// workers/paymentWorker.ts
import { Worker } from "bullmq";
import { connection } from "../utils/redis";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log("Starting Payment Worker...");

export const paymentWorker = new Worker(
  "paymentQueue",
  async (job) => {
    console.log("📥 Payment Job received:", job.name, job.data);

    try {
      if (job.name === "sendPaymentConfirmation") {
        const { userEmail, paymentId, amount } = job.data;

        const info = await transporter.sendMail({
          from: '"Shop" <noreply@shop.com>',
          to: userEmail,
          subject: `Payment Confirmation #${paymentId}`,
          text: `Your payment of $${amount} has been successfully processed!`,
          html: `<p>Your payment of <strong>$${amount}</strong> has been successfully processed!</p>
                 <p>Payment ID: <strong>${paymentId}</strong></p>
                 <p>Thank you for shopping with us!</p>`,
        });

        console.log(`Payment confirmation email sent to ${userEmail}`);
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
      }

      // You can add other payment-related jobs here, e.g., notifyAdmin, logTransaction, etc.

    } catch (err) {
      console.error(" Payment job failed:", err);
    }
  },
  { connection }
);

paymentWorker.on("completed", (job) => {
  console.log(` Payment Job ${job.id} completed`);
});

paymentWorker.on("failed", (job, err) => {
  if (job) {
    console.error(` Payment Job ${job.id} failed:`, err.message);
  } else {
    console.error(` Payment Job failed:`, err?.message);
  }
});
