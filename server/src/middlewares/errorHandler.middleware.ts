// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error("Unhandled error occurred", {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({ message: "Internal Server Error" });
};
