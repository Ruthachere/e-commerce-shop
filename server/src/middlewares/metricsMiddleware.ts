import { Request, Response, NextFunction } from "express";
import { httpRequestDuration, inFlightRequests } from "../monitoring/metrics";

export const metricsMiddleware = (serviceName = "my-service") => {
  return (req: Request, res: Response, next: NextFunction) => {
    inFlightRequests.inc({ service: serviceName });
    const end = httpRequestDuration.startTimer({
      method: req.method,
      route: req.route?.path ?? req.path,
      service: serviceName,
    });

    res.on("finish", () => {
      end({ status_code: String(res.statusCode) });
      inFlightRequests.dec({ service: serviceName });
    });

    next();
  };
};
