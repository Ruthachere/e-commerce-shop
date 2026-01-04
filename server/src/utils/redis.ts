import Redis from "ioredis";

export const connection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

connection.on("connect", () => console.log(" Redis connected"));
connection.on("error", (err) => console.error(" Redis error:", err));

export default connection;
