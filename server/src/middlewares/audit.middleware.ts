// src/middleware/audit.ts
import { Response, Request, NextFunction } from "express";
import { logAudit } from "../utils/auditLogger.utils";


export function audit(action: string, entity: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const oldSend = res.send.bind(res);

    (res as any) .send = (body:any)=> {
        try {
        const data = typeof body === "string" ? JSON.parse(body) : body;

        logAudit({
          userId: (req as any).user?.id,  // only works if you have authentication middleware
          action,
          entity,
          entityId: data?.id ?? Number(req.params?.id),
          changes: req.body,
          ipAddress: req.ip,
        });
      } catch (e) {
        console.error("Audit middleware error:", e);
      }

      return oldSend(body);
    };

    next();
  };
}
