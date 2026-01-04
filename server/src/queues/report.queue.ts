// queues/reportQueue.ts
import { Queue } from "bullmq";
import { connection } from "../utils/redis";

export const reportQueue = new Queue("reportQueue", { connection });
