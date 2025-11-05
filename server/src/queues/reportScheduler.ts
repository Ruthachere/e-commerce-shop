import { reportQueue } from "./report.queue";

async function scheduleReports() {
  // Daily report - 8 AM
  await reportQueue.add(
    "generateSalesReport",
    { type: "Daily" },
    {
      repeat: { pattern: "0 8 * * *" },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
  console.log("✅ Daily sales report scheduled at 8 AM");

  // Weekly report - 8 AM Monday
  await reportQueue.add(
    "generateSalesReport",
    { type: "Weekly" },
    {
      repeat: { pattern: "0 8 * * 1" },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );

  // Monthly report - 8 AM on 1st
  await reportQueue.add(
    "generateSalesReport",
    { type: "Monthly" },
    {
      repeat: { pattern: "0 8 1 * *" },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );

  console.log("✅ Weekly & Monthly report schedules registered");
}

scheduleReports();
