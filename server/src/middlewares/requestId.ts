import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

export const requestId = () => (req: Request, res: Response, next: NextFunction) => {
  const id = req.headers["x-request-id"]?.toString() ?? uuidv4();
  (req as any).reqId = id;
  res.setHeader("x-request-id", id);
  next();
};
