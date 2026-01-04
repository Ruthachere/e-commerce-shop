// queues/orderQueue.ts
import { Queue } from "bullmq";
import { connection } from "../utils/redis";

export const orderQueue = new Queue("orderQueue", { connection });
export const paymentQueue = new Queue("paymentQueue", { connection });



