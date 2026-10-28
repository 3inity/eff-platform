import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: competitionId } = await params;

    const [participants, teams] = await Promise.all([
      prisma.competitionParticipant.findMany({
        where: { competitionId },
        include: {
          player: true,
          team: true,
        },
        orderBy: { status: "asc" },
      }),
      prisma.team.findMany({
        where: { competitionId },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ participants, teams });
  } catch (error) {
    console.error("GET /api/admin/competitions/[id]/participants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch participants and teams." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN", "PLAYER_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id: competitionId } = await params;
    const body = await req.json();
    const { playerId, teamId: reqTeamId, teamName, teamLogoUrl, nationality } = body;

    if (!playerId) {
      return NextResponse.json({ error: "Player ID is required." }, { status: 400 });
    }

    // Verify competition exists
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });
    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // Check if player is already in this competition
    const existing = await prisma.competitionParticipant.findUnique({
      where: {
        competitionId_playerId: {
          competitionId,
          playerId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Player is already registered in this competition." },
        { status: 400 }
      );
    }

    // Optionally update player nationality if selected
    if (nationality) {
      await prisma.player.update({
        where: { id: playerId },
        data: { nationality: String(nationality).toUpperCase().trim() },
      });
    }

    let teamId: string | null = reqTeamId || null;
    let finalTeamName = teamName ? teamName.trim() : null;
    let finalTeamLogoUrl = teamLogoUrl ? teamLogoUrl.trim() : null;

    if (teamId) {
      const existingTeam = await prisma.team.findUnique({ where: { id: teamId } });
      if (existingTeam) {
        finalTeamName = existingTeam.name;
        finalTeamLogoUrl = finalTeamLogoUrl || existingTeam.logoUrl;
      }
    } else if (finalTeamName) {
      // Find or create team by name in this competition
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

    const participant = await prisma.competitionParticipant.create({
      data: {
        competitionId,
        playerId,
        teamId,
        teamName: finalTeamName,
        teamLogoUrl: finalTeamLogoUrl,
        status: "APPROVED",
      },
      include: {
        player: true,
        team: true,
      },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "LINK_PLAYER_TEAM",
      targetTable: "CompetitionParticipant",
      targetId: participant.id,
      newValue: {
        competition: competition.name,
        player: participant.player.username,
        teamName: finalTeamName,
        nationality: nationality || null,
      },
    });

    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal/competitions");
    revalidatePath("/");

    return NextResponse.json({ success: true, participant });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/participants error:", error);
    return NextResponse.json(
      { error: "Failed to link player to competition." },
      { status: 500 }
    );
  }
}

