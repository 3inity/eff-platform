import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN", "PLAYER_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id: competitionId, pid: participantId } = await params;
    const body = await req.json();
    const { teamName, teamLogoUrl, status, groupName, seed } = body;

    const existing = await prisma.competitionParticipant.findUnique({
      where: { id: participantId },
      include: { player: true, team: true },
    });

    if (!existing || existing.competitionId !== competitionId) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 });
    }

    let teamId = existing.teamId;
    let finalTeamName = teamName !== undefined ? (teamName ? teamName.trim() : null) : existing.teamName;
    let finalTeamLogoUrl = teamLogoUrl !== undefined ? (teamLogoUrl ? teamLogoUrl.trim() : null) : existing.teamLogoUrl;

    if (teamName !== undefined && finalTeamName) {
      let team = await prisma.team.findUnique({
        where: {
          competitionId_name: {
            competitionId,
            name: finalTeamName,
          },
        },
      });

      if (!team) {
        team = await prisma.team.create({
          data: {
            competitionId,
            name: finalTeamName,
            logoUrl: finalTeamLogoUrl || null,
          },
        });
      } else if (finalTeamLogoUrl && !team.logoUrl) {
        team = await prisma.team.update({
          where: { id: team.id },
          data: { logoUrl: finalTeamLogoUrl },
        });
      }

      teamId = team.id;
    }

    const updated = await prisma.competitionParticipant.update({
      where: { id: participantId },
      data: {
        ...(teamName !== undefined && { teamId, teamName: finalTeamName }),
        ...(teamLogoUrl !== undefined && { teamLogoUrl: finalTeamLogoUrl }),
        ...(status !== undefined && { status }),
        ...(groupName !== undefined && { groupName: groupName || null }),
        ...(seed !== undefined && { seed: seed ? parseInt(seed, 10) : null }),
      },
      include: { player: true, team: true },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "UPDATE_PARTICIPANT_TEAM",
      targetTable: "CompetitionParticipant",
      targetId: participantId,
      oldValue: { teamName: existing.teamName, teamLogoUrl: existing.teamLogoUrl, status: existing.status },
      newValue: { teamName: updated.teamName, teamLogoUrl: updated.teamLogoUrl, status: updated.status },
    });

    return NextResponse.json({ success: true, participant: updated });
  } catch (error) {
    console.error("PATCH participant error:", error);
    return NextResponse.json({ error: "Failed to update participant." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN", "PLAYER_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id: competitionId, pid: participantId } = await params;

    const existing = await prisma.competitionParticipant.findUnique({
      where: { id: participantId },
      include: { player: true },
    });

    if (!existing || existing.competitionId !== competitionId) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 });
    }

    await prisma.competitionParticipant.delete({
      where: { id: participantId },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "REMOVE_PARTICIPANT",
      targetTable: "CompetitionParticipant",
      targetId: participantId,
      oldValue: { player: existing.player.username, competitionId },
      newValue: null,
    });

    return NextResponse.json({ success: true, message: "Participant removed." });
  } catch (error) {
    console.error("DELETE participant error:", error);
    return NextResponse.json({ error: "Failed to remove participant." }, { status: 500 });
  }
}
