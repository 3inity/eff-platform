import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "SUPER_ADMIN access required to revert actions." }, { status: 403 });
    }

    const { id } = await params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json({ error: "Audit log entry not found." }, { status: 404 });
    }

    if (log.isReverted) {
      return NextResponse.json({ error: "This action has already been reverted." }, { status: 400 });
    }

    if (!log.oldValue) {
      return NextResponse.json(
        { error: "Cannot revert an action that does not have an oldValue recorded." },
        { status: 400 }
      );
    }

    const oldValue = log.oldValue as Record<string, unknown>;

    // Dynamically revert target table based on recorded table name
    if (log.targetTable === "Player") {
      const allowedKeys = [
        "username",
        "xHandle",
        "teamName",
        "avatarUrl",
        "nationality",
        "wins",
        "draws",
        "losses",
        "goalsFor",
        "goalsAgainst",
        "coins",
      ];
      const dataToRestore: Record<string, unknown> = {};
      for (const k of allowedKeys) {
        if (oldValue[k] !== undefined) {
          dataToRestore[k] = oldValue[k];
        }
      }

      await prisma.player.update({
        where: { id: log.targetId },
        data: dataToRestore,
      });
    } else if (log.targetTable === "Competition") {
      await prisma.competition.update({
        where: { id: log.targetId },
        data: oldValue,
      });
    } else if (log.targetTable === "Admin") {
      if (oldValue.role) {
        await prisma.admin.update({
          where: { id: log.targetId },
          data: { role: oldValue.role as any },
        });
      }
    }

    // Mark original audit log as reverted
    await prisma.auditLog.update({
      where: { id },
      data: {
        isReverted: true,
        revertedBy: session.adminId,
        revertedAt: new Date(),
      },
    });

    // Write a new AuditLog entry documenting the revert
    await createAuditLog({
      adminId: session.adminId,
      actionType: "REVERT_ACTION",
      targetTable: log.targetTable,
      targetId: log.targetId,
      oldValue: log.newValue,
      newValue: {
        revertedLogId: log.id,
        restoredValue: log.oldValue,
      },
    });

    return NextResponse.json({ success: true, message: "Action reverted successfully." });
  } catch (error) {
    console.error("POST /api/admin/audit/[id]/revert error:", error);
    return NextResponse.json(
      { error: "Failed to revert audit log action." },
      { status: 500 }
    );
  }
}
