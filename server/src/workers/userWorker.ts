// workers/userWorker.ts
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


export const userWorker = new Worker(
  "userQueue",
  async (job) => {
    console.log("📥 Job received:", job.name, job.data);

    try {
      if (job.name === "sendWelcomeEmail") {
        const { userEmail, userName } = job.data;

        const info = await transporter.sendMail({
          from: '"MyShop" <noreply@myshop.com>',
          to: userEmail,
          subject: `Welcome to MyShop, ${userName}!`,
          text: `Hi ${userName},\n\nThank you for registering at MyShop! We're excited to have you.\n\nBest regards,\nMyShop Team`,
          html: `<p>Hi <strong>${userName}</strong>,</p>
                 <p>Thank you for registering at <strong>MyShop</strong>! We're excited to have you.</p>
                 <p>Best regards,<br/>MyShop Team</p>`,
        });

      }
    } catch (err) {
      console.error(" Job failed:", err);
    }
  },
  { connection }
);

userWorker.on("completed", (job) => {
  console.log(` Job ${job.id} completed`);
});

userWorker.on("failed", (job, err) => {
  if (job) {
    console.error(` Job ${job.id} failed:`, err.message);
  } else {
    console.error(` Job failed:`, err?.message);
  }
});
