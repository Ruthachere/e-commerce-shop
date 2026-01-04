import { Router } from "express";

import { prisma } from "../utils/prisma";
import { reportQueue } from "../queues/report.queue";

const router = Router();

// Manually trigger report
router.post("/run-daily", async (req, res) => {
  await reportQueue.add("generateSalesReport", {}, { removeOnComplete: true });
  res.json({ message: "Daily sales report queued" });
});

// Get daily sales report results
router.get("/daily", async (req, res) => {
  const sales = await prisma.order.groupBy({
    by: ["createdAt"],
    _sum: { totalAmount: true },
    orderBy: { createdAt: "asc" }
  });

  res.json(sales);
});

export default router;
