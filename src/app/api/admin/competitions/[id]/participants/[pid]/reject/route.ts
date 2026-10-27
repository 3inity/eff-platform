import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN", "PLAYER_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id: competitionId, pid: participantId } = await params;

    const participant = await prisma.competitionParticipant.findUnique({
      where: { id: participantId },
      include: { player: true, competition: true },
    });

    if (!participant || participant.competitionId !== competitionId) {
      return NextResponse.json({ error: "Participant not found in this competition." }, { status: 404 });
    }

    const updated = await prisma.competitionParticipant.update({
      where: { id: participantId },
      data: { status: "REJECTED" },
      include: { player: true },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "REJECT_PARTICIPANT",
      targetTable: "CompetitionParticipant",
      targetId: participantId,
      oldValue: { status: participant.status },
      newValue: {
        status: "REJECTED",
        player: updated.player.username,
        competition: participant.competition.name,
      },
    });

    return NextResponse.json({ success: true, participant: updated });
  } catch (error) {
    console.error("POST reject participant error:", error);
    return NextResponse.json(
      { error: "Failed to reject participant." },
      { status: 500 }
    );
  }
}
