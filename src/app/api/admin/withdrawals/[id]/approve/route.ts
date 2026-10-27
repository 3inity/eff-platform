import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "BET_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id } = await params;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: { player: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found." }, { status: 404 });
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json(
        { error: `Withdrawal request is already ${withdrawal.status}.` },
        { status: 400 }
      );
    }

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "APPROVE_WITHDRAWAL",
      targetTable: "Withdrawal",
      targetId: id,
      oldValue: { status: withdrawal.status, amount: withdrawal.amount },
      newValue: {
        status: "APPROVED",
        amountRecovered: withdrawal.amount,
        player: withdrawal.player.username,
        playerId: withdrawal.playerId,
      },
    });

    return NextResponse.json({ success: true, withdrawal: updated });
  } catch (error) {
    console.error("POST /api/admin/withdrawals/[id]/approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve withdrawal." },
      { status: 500 }
    );
  }
}
