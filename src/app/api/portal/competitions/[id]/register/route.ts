import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getPlayerSession } from "@/lib/auth-player";
import { findBundledTeam, findConflictingParticipant } from "@/lib/teams";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPlayerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { id: competitionId } = await params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty if simple request
    }
    const { teamId: reqTeamId, teamName: reqTeamName, teamLogoUrl: reqTeamLogoUrl } = body;

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        participants: {
          include: {
            player: {
              select: { id: true, username: true },
            },
          },
        },
        teams: true,
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // 1. Check status is REGISTRATION_OPEN
    if (competition.status !== "REGISTRATION_OPEN") {
      return NextResponse.json(
        { error: "Registration is not currently open for this competition." },
        { status: 400 }
      );
    }

    // 2. Check registration time window
    const now = new Date();
    if (competition.registrationOpenAt && now < competition.registrationOpenAt) {
      return NextResponse.json(
        { error: "Registration window has not opened yet." },
        { status: 400 }
      );
    }

    if (competition.registrationCloseAt && now > competition.registrationCloseAt) {
      return NextResponse.json(
        { error: "Registration window has expired." },
        { status: 400 }
      );
    }

    // 3. Check capacity limit
    const approvedCount = competition.participants.filter(
      (p) => p.status === "APPROVED"
    ).length;

    if (competition.maxParticipants && approvedCount >= competition.maxParticipants) {
      return NextResponse.json(
        { error: "This competition has reached its maximum participant capacity." },
        { status: 400 }
      );
    }

    // 4. Resolve team and verify it is not taken
    let teamId: string | null = reqTeamId || null;
    let finalTeamName: string | null = reqTeamName ? reqTeamName.trim() : null;
    let finalTeamLogoUrl: string | null = reqTeamLogoUrl ? reqTeamLogoUrl.trim() : null;

    const bundled = findBundledTeam(reqTeamId || reqTeamName);
    if (bundled) {
      finalTeamName = bundled.name;
    }

    // Check if team is taken by another active participant in this competition (using canonical alias-aware check)
    const candidateIdentifier = bundled ? bundled.id : (finalTeamName || reqTeamId);
    if (candidateIdentifier) {
      const conflict = findConflictingParticipant(
        candidateIdentifier,
        competition.participants,
        session.playerId
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

    // Robust Team resolution:
    // 1. Check if reqTeamId is an existing Team record in this competition
    let dbTeam = null;
    if (reqTeamId) {
      dbTeam = competition.teams.find((t) => t.id === reqTeamId) || null;
      if (!dbTeam) {
        dbTeam = await prisma.team.findFirst({
          where: { id: reqTeamId, competitionId },
        });
      }
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

    // 5. Check if already registered
    const existing = competition.participants.find(
      (p) => p.playerId === session.playerId
    );

    const status = competition.requiresApproval ? "PENDING" : "APPROVED";

    if (existing) {
      if (existing.status === "WITHDRAWN") {
        // Re-activate registration and assign selected team
        const updated = await prisma.competitionParticipant.update({
          where: { id: existing.id },
          data: {
            status,
            teamId: validTeamId || existing.teamId,
            teamName: finalTeamName || existing.teamName,
            teamLogoUrl: finalTeamLogoUrl || existing.teamLogoUrl,
          },
        });

        revalidatePath(`/competition/${competitionId}`);
        revalidatePath("/admin/competitions");
        revalidatePath("/portal/competitions");
        revalidatePath("/");

        return NextResponse.json({
          success: true,
          participant: updated,
          message: competition.requiresApproval
            ? "Re-registration submitted and pending admin approval."
            : "Successfully registered for competition.",
        });
      }

      return NextResponse.json(
        { error: `You are already registered with status: ${existing.status}. Your team is locked.` },
        { status: 400 }
      );
    }

    // 6. Create participant
    const participant = await prisma.competitionParticipant.create({
      data: {
        competitionId,
        playerId: session.playerId,
        teamId: validTeamId,
        teamName: finalTeamName,
        teamLogoUrl: finalTeamLogoUrl,
        status,
      },
    });

    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal/competitions");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      participant,
      message: competition.requiresApproval
        ? "Registration submitted and pending admin review."
        : "Successfully registered for the competition!",
    });
  } catch (error: any) {
    console.error("POST /api/portal/competitions/[id]/register error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "You are already registered in this competition." },
        { status: 409 }
      );
    }

    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: `Database reference error: ${error?.meta?.field_name || "Invalid foreign key constraint."}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Failed to register for competition." },
      { status: 500 }
    );
  }
}

