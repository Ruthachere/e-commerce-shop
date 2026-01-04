// workers/orderWorker.ts
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
console.log("Starting Order Worker...");

export const orderWorker = new Worker(
  "orderQueue",
  async (job) => {
    console.log("📥 Job received:", job.name, job.data);

    try {
      if (job.name === "sendConfirmationEmail") {
        const { userEmail, orderId } = job.data;

        const info = await transporter.sendMail({
          from: '"Shop" <noreply@shop.com>',
          to: userEmail,
          subject: `Order Confirmation #${orderId}`,
          text: `Your order #${orderId} has been confirmed!`,
        });

        console.log(`Email sent to ${userEmail}`);
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
      }
    } catch (err) {
      console.error(" Job failed:", err);
    }
  },
  { connection }
);

orderWorker.on("completed", (job) => {
  console.log(` Job ${job.id} completed`);
});

orderWorker.on("failed", (job, err) => {
  if (job) {
    console.error(` Job ${job.id} failed:`, err.message);
  } else {
    console.error(` Job failed:`, err.message);
  }
});
