// src/utils/auditLogger.ts
import { prisma } from "../utils/prisma";

interface AuditLogOptions {
  userId?: number;
  action: string;
  entity: string;
  entityId?: number;
  changes?: object;
  ipAddress?: string;
}

export async function logAudit(options: AuditLogOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        changes: options.changes,
        ipAddress: options.ipAddress,
      },
    });
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
}
