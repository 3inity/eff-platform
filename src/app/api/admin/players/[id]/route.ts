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
    if (!session || !checkAdminPermission(session.role, ["PLAYER_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    const updated = await prisma.player.update({
      where: { id },
      data: {
        ...(body.username !== undefined && { username: body.username }),
        ...(body.xHandle !== undefined && { xHandle: body.xHandle }),
        ...(body.teamName !== undefined && { teamName: body.teamName }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
        ...(body.nationality !== undefined && { nationality: body.nationality }),
        ...(body.wins !== undefined && { wins: parseInt(body.wins, 10) }),
        ...(body.draws !== undefined && { draws: parseInt(body.draws, 10) }),
        ...(body.losses !== undefined && { losses: parseInt(body.losses, 10) }),
        ...(body.goalsFor !== undefined && { goalsFor: parseInt(body.goalsFor, 10) }),
        ...(body.goalsAgainst !== undefined && { goalsAgainst: parseInt(body.goalsAgainst, 10) }),
        ...(body.coins !== undefined && { coins: parseInt(body.coins, 10) }),
      },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "UPDATE_PLAYER",
      targetTable: "Player",
      targetId: id,
      oldValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ success: true, player: updated });
  } catch (error) {
    console.error("PATCH /api/admin/players/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update player." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["PLAYER_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission. PLAYER_ADMIN or SUPER_ADMIN required." }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.player.findUnique({
      where: { id },
      include: {
        credential: true,
        competitionParticipants: true,
        bets: true,
        withdrawals: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    // Write audit log before deleting
    await createAuditLog({
      adminId: session.adminId,
      actionType: "DELETE_PLAYER",
      targetTable: "Player",
      targetId: id,
      oldValue: {
        id: existing.id,
        username: existing.username,
        xHandle: existing.xHandle,
        teamName: existing.teamName,
        coins: existing.coins,
        wins: existing.wins,
        draws: existing.draws,
        losses: existing.losses,
        goalsFor: existing.goalsFor,
        goalsAgainst: existing.goalsAgainst,
        participationsCount: existing.competitionParticipants.length,
        betsCount: existing.bets.length,
      },
      newValue: { deletedAt: new Date().toISOString(), deletedBy: session.username },
    });

    // Delete player - database foreign keys cascade delete credentials, participations, bets, withdrawals
    await prisma.player.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Player @${existing.username} and all associated registrations have been permanently deleted.`,
    });
  } catch (error) {
    console.error("DELETE /api/admin/players/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete player." },
      { status: 500 }
    );
  }
}
