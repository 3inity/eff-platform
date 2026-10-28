import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";
import { findBundledTeam, findConflictingParticipant } from "@/lib/teams";

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
    const { playerId, teamId: reqTeamId, teamName, teamLogoUrl, nationality, force } = body;
    const isForce = Boolean(force || body.forceAssign || body.adminOverride);

    if (isForce && !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN"])) {
      return NextResponse.json(
        { error: "Only Super Admin and Match Admin are permitted to force assign taken teams." },
        { status: 403 }
      );
    }

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

    // Check for team conflicts unless force flag is active
    let finalTeamName = teamName ? teamName.trim() : null;
    let finalTeamLogoUrl = teamLogoUrl ? teamLogoUrl.trim() : null;

    const bundled = findBundledTeam(reqTeamId || teamName);
    if (bundled) {
      finalTeamName = bundled.name;
    }

    if (!isForce && (bundled || finalTeamName || reqTeamId)) {
      const existingParticipants = await prisma.competitionParticipant.findMany({
        where: { competitionId },
        include: { player: true, team: true },
      });

      const candidateIdentifier = bundled ? bundled.id : (finalTeamName || reqTeamId)!;
      const conflict = findConflictingParticipant(
        candidateIdentifier,
        existingParticipants,
        playerId
      );

      if (conflict) {
        return NextResponse.json(
          {
            error: `This team is already taken by @${
              conflict.player?.username || "another competitor"
            } in this competition`,
          },
          { status: 409 }
        );
      }
    }

    // Optionally update player nationality if selected
    if (nationality) {
      await prisma.player.update({
        where: { id: playerId },
        data: { nationality: String(nationality).toUpperCase().trim() },
      });
    }

    // Robust Team resolution:
    // 1. Check if reqTeamId is an existing Team record in this competition
    let dbTeam = null;
    if (reqTeamId) {
      dbTeam = await prisma.team.findFirst({
        where: { id: reqTeamId, competitionId },
      });
    }

    // 2. If not found by ID (e.g. reqTeamId was a slug or custom ID), look up by name in this competition
    if (!dbTeam && finalTeamName) {
      dbTeam = await prisma.team.findUnique({
        where: {
          competitionId_name: {
            competitionId,
            name: finalTeamName,
          },
        },
      });
    }

    // 3. If team doesn't exist yet in this competition, auto-create it
    if (!dbTeam && finalTeamName) {
      dbTeam = await prisma.team.create({
        data: {
          competitionId,
          name: finalTeamName,
          logoUrl: finalTeamLogoUrl || null,
        },
      });
    } else if (dbTeam) {
      finalTeamName = dbTeam.name;
      if (finalTeamLogoUrl && !dbTeam.logoUrl) {
        dbTeam = await prisma.team.update({
          where: { id: dbTeam.id },
          data: { logoUrl: finalTeamLogoUrl },
        });
      }
      finalTeamLogoUrl = finalTeamLogoUrl || dbTeam.logoUrl;
    }

    const validTeamId: string | null = dbTeam ? dbTeam.id : null;

    // Handle existing participant (withdrawn vs already registered)
    if (existing) {
      if (existing.status === "WITHDRAWN") {
        const reactivated = await prisma.competitionParticipant.update({
          where: { id: existing.id },
          data: {
            status: "APPROVED",
            teamId: validTeamId,
            teamName: finalTeamName,
            teamLogoUrl: finalTeamLogoUrl,
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
          targetId: reactivated.id,
          newValue: {
            competition: competition.name,
            player: reactivated.player.username,
            teamName: finalTeamName,
            nationality: nationality || null,
            note: "Re-enrolled withdrawn player",
          },
        });

        revalidatePath(`/competition/${competitionId}`);
        revalidatePath("/admin/competitions");
        revalidatePath("/portal/competitions");
        revalidatePath("/");

        return NextResponse.json({ success: true, participant: reactivated });
      }

      return NextResponse.json(
        { error: "Player is already registered in this competition." },
        { status: 409 }
      );
    }

    console.log("Creating CompetitionParticipant with:", {
      competitionId,
      playerId,
      teamId: validTeamId,
      teamName: finalTeamName,
      teamLogoUrl: finalTeamLogoUrl,
    });

    const participant = await prisma.competitionParticipant.create({
      data: {
        competitionId,
        playerId,
        teamId: validTeamId,
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
  } catch (error: any) {
    console.error("POST /api/admin/competitions/[id]/participants error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Player is already registered in this competition." },
        { status: 409 }
      );
    }

    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: `Database reference error: ${error?.meta?.field_name || "Invalid foreign key constraint on team or player."}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Failed to link player to competition." },
      { status: 500 }
    );
  }
}

