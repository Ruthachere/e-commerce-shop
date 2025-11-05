// src/utils/logger.ts
import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

const logDir = path.resolve(__dirname, "../../logs");

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const fileFormat = format.combine(format.timestamp(), format.json());

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp(),
  format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ""
    }`;
  })
);

export const logger = createLogger({
  level: "info", // Global level
  transports: [
    // ✅ Logs to console (dev-friendly)
    new transports.Console({
      format: consoleFormat,
    }),

    // ✅ Logs to file (structured logs)
    new transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: fileFormat,
    }),

    new transports.File({
      filename: path.join(logDir, "combined.log"),
      level: "info",
      format: fileFormat,
    }),
  ],
});
