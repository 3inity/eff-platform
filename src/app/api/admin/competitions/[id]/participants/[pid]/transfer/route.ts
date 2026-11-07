import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id: competitionId, pid: participantId } = await params;
    const body = await req.json();
    const { newPlayerId } = body;

    if (!newPlayerId || typeof newPlayerId !== "string") {
      return NextResponse.json({ error: "New player ID is required." }, { status: 400 });
    }

    // 1. Find the existing participant
    const existing = await prisma.competitionParticipant.findUnique({
      where: { id: participantId },
      include: {
        player: true,
        team: true,
        competition: true,
      },
    });

    if (!existing || existing.competitionId !== competitionId) {
      return NextResponse.json({ error: "Participant not found in this competition." }, { status: 404 });
    }

    const oldPlayerId = existing.playerId;

    if (oldPlayerId === newPlayerId) {
      return NextResponse.json({ error: "The new player cannot be the same as the current player." }, { status: 400 });
    }

    // 2. Verify new player exists
    const newPlayer = await prisma.player.findUnique({
      where: { id: newPlayerId },
    });

    if (!newPlayer) {
      return NextResponse.json({ error: "New player not found in the system." }, { status: 404 });
    }

    // 3. Verify new player is not already enrolled in this competition
    const existingEnrollment = await prisma.competitionParticipant.findUnique({
      where: {
        competitionId_playerId: {
          competitionId,
          playerId: newPlayerId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: `Player @${newPlayer.username} is already enrolled in this competition.` },
        { status: 400 }
      );
    }

    // 4. Validation: Check if old player has any matches currently marked as "In Progress" or "Live"
    const inProgressMatches = await prisma.match.findMany({
      where: {
        competitionId,
        isCompleted: false,
        OR: [
          { homePlayerId: oldPlayerId },
          { awayPlayerId: oldPlayerId },
        ],
        AND: [
          {
            OR: [
              { homeScore: { not: null } },
              { awayScore: { not: null } },
              {
                scheduledAt: {
                  lte: new Date(),
                  gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Within 2 hours of kickoff
                },
              },
            ],
          },
        ],
      },
    });

    if (inProgressMatches.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot transfer team: The player currently has a match marked as In Progress or Live. Please finalize or reset the active match before transferring.",
        },
        { status: 400 }
      );
    }

    // 5. Perform the transfer in a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find all completed matches in this competition for the old player to compute stat shifts
      const completedMatches = await tx.match.findMany({
        where: {
          competitionId,
          isCompleted: true,
          OR: [
            { homePlayerId: oldPlayerId },
            { awayPlayerId: oldPlayerId },
          ],
        },
      });

      let transferredWins = 0;
      let transferredDraws = 0;
      let transferredLosses = 0;
      let transferredGoalsFor = 0;
      let transferredGoalsAgainst = 0;

      for (const m of completedMatches) {
        if (m.homeScore === null || m.awayScore === null) continue;
        const isHome = m.homePlayerId === oldPlayerId;
        const myScore = isHome ? m.homeScore : m.awayScore;
        const oppScore = isHome ? m.awayScore : m.homeScore;

        transferredGoalsFor += myScore;
        transferredGoalsAgainst += oppScore;

        if (myScore > oppScore) transferredWins++;
        else if (myScore === oppScore) transferredDraws++;
        else transferredLosses++;
      }

      // Revert stats from old player
      if (completedMatches.length > 0) {
        await tx.player.update({
          where: { id: oldPlayerId },
          data: {
            wins: { decrement: transferredWins },
            draws: { decrement: transferredDraws },
            losses: { decrement: transferredLosses },
            goalsFor: { decrement: transferredGoalsFor },
            goalsAgainst: { decrement: transferredGoalsAgainst },
          },
        });

        // Credit stats to new player
        await tx.player.update({
          where: { id: newPlayerId },
          data: {
            wins: { increment: transferredWins },
            draws: { increment: transferredDraws },
            losses: { increment: transferredLosses },
            goalsFor: { increment: transferredGoalsFor },
            goalsAgainst: { increment: transferredGoalsAgainst },
          },
        });
      }

      // Reassign all matches in this competition to the new player
      await tx.match.updateMany({
        where: {
          competitionId,
          homePlayerId: oldPlayerId,
        },
        data: {
          homePlayerId: newPlayerId,
        },
      });

      await tx.match.updateMany({
        where: {
          competitionId,
          awayPlayerId: oldPlayerId,
        },
        data: {
          awayPlayerId: newPlayerId,
        },
      });

      // Reassign the CompetitionParticipant record to new player (team stays the same)
      const updatedParticipant = await tx.competitionParticipant.update({
        where: { id: participantId },
        data: {
          playerId: newPlayerId,
        },
        include: {
          player: true,
          team: true,
        },
      });

      return {
        updatedParticipant,
        transferredMatchesCount: completedMatches.length,
        stats: {
          wins: transferredWins,
          draws: transferredDraws,
          losses: transferredLosses,
          goalsFor: transferredGoalsFor,
          goalsAgainst: transferredGoalsAgainst,
        },
      };
    });

    // 6. Audit Log
    await createAuditLog({
      adminId: session.adminId,
      actionType: "TRANSFER_TEAM",
      targetTable: "CompetitionParticipant",
      targetId: participantId,
      oldValue: {
        competitionId,
        playerId: oldPlayerId,
        username: existing.player.username,
        teamName: existing.teamName || existing.team?.name,
      },
      newValue: {
        competitionId,
        playerId: newPlayerId,
        username: newPlayer.username,
        teamName: existing.teamName || existing.team?.name,
        transferredMatches: result.transferredMatchesCount,
        stats: result.stats,
      },
    });

    // 7. Revalidate relevant pages
    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal");
    revalidatePath("/portal/competitions");
    revalidatePath("/portal/bets");

    return NextResponse.json({
      success: true,
      message: `Team "${existing.teamName || existing.team?.name || "Team"}" successfully transferred to @${newPlayer.username}.`,
      participant: result.updatedParticipant,
      transferredMatches: result.transferredMatchesCount,
      stats: result.stats,
    });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/participants/[pid]/transfer error:", error);
    return NextResponse.json({ error: "Failed to transfer team." }, { status: 500 });
  }
}

