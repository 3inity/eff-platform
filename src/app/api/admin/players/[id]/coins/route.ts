import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "BET_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { amount, mode, reason } = body; 
    // mode: "ADD" | "SUBTRACT" | "SET"

    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    const delta = parseInt(amount, 10);
    if (isNaN(delta)) {
      return NextResponse.json({ error: "Invalid coin amount." }, { status: 400 });
    }

    let newCoins = existing.coins;
    if (mode === "ADD") {
      newCoins += delta;
    } else if (mode === "SUBTRACT") {
      newCoins = Math.max(0, newCoins - delta);
    } else {
      newCoins = Math.max(0, delta);
    }

    const updated = await prisma.player.update({
      where: { id },
      data: { coins: newCoins },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "ADJUST_COINS",
      targetTable: "Player",
      targetId: id,
      oldValue: { coins: existing.coins },
      newValue: { coins: newCoins, mode, delta, reason: reason || "Admin coin adjustment" },
    });

    return NextResponse.json({ success: true, player: updated });
  } catch (error) {
    console.error("PATCH /api/admin/players/[id]/coins error:", error);
    return NextResponse.json(
      { error: "Failed to adjust player coins." },
      { status: 500 }
    );
  }
}
