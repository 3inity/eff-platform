import { prisma } from "@/db";

export interface CreateAuditLogParams {
  adminId: string;
  actionType: string;
  targetTable: string;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function createAuditLog({
  adminId,
  actionType,
  targetTable,
  targetId,
  oldValue,
  newValue,
}: CreateAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        adminId,
        actionType,
        targetTable,
        targetId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
