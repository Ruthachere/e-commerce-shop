// queues/orderQueue.ts
import { Queue } from "bullmq";
import { connection } from "../utils/redis";

export const userQueue = new Queue("userQueue", { connection });

