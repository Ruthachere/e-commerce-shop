import { PrismaClient } from "@prisma/client";
import { dbQueryDuration } from "../monitoring/metrics";

const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  const start = process.hrtime();
  const result = await next(params);
  const diff = process.hrtime(start);
  const durationSec = diff[0] + diff[1] / 1e9;
  dbQueryDuration.observe({
    model: params.model ?? "raw",
    operation: params.action,
  }, durationSec);
  return result;
});

export default prisma;
