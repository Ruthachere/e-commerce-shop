import { Worker } from "bullmq";
import { connection } from "../utils/redis";
import { prisma } from "../utils/prisma";

export const reportWorker = new Worker(
  "reportQueue",
  async (job) => {
    if (job.name === "generateSalesReport") {
      console.log("Running Daily Report Job...");

      const sales = await prisma.order.groupBy({
        by: ["createdAt"],
        _sum: { totalAmount: true },
        orderBy: { createdAt: "asc" },
      });

      console.log("Daily Sales Report Generated ✅", sales);
    }
  },
  { connection }
);
