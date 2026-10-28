import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";
import { getNextBracketSlot, resolveTieWinner } from "@/lib/fixtures";

export async function POST(req: Request) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["MATCH_ADMIN", "SUPER_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const body = await req.json();
    const {
      matchId,
      competitionId: reqCompId,
      homePlayerId: reqHomeId,
      awayPlayerId: reqAwayId,
      homeScore: rawHomeScore,
      awayScore: rawAwayScore,
      homePenalty: rawHomePenalty,
      awayPenalty: rawAwayPenalty,
      playedAt,
    } = body;

    const homeScore = parseInt(rawHomeScore, 10);
    const awayScore = parseInt(rawAwayScore, 10);
    const homePenalty = rawHomePenalty !== undefined && rawHomePenalty !== null && rawHomePenalty !== ""
      ? parseInt(rawHomePenalty, 10)
      : null;
    const awayPenalty = rawAwayPenalty !== undefined && rawAwayPenalty !== null && rawAwayPenalty !== ""
      ? parseInt(rawAwayPenalty, 10)
      : null;

    if (isNaN(homeScore) || isNaN(awayScore)) {
      return NextResponse.json({ error: "Valid home and away scores are required." }, { status: 400 });
    }

    // MODE 1: Update an existing fixture (matchId provided)
    if (matchId) {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          competition: true,
          homePlayer: true,
          awayPlayer: true,
        },
      });

      if (!match) {
        return NextResponse.json({ error: "Match not found." }, { status: 404 });
      }

      const homePlayerId = reqHomeId || match.homePlayerId;
      const awayPlayerId = reqAwayId || match.awayPlayerId;

      if (!homePlayerId || !awayPlayerId) {
        return NextResponse.json(
          { error: "Both home and away players must be assigned to enter a match result." },
          { status: 400 }
        );
      }

      const compId = match.competitionId;

      const updated = await prisma.$transaction(async (tx) => {
        // Revert previous stat contributions if match was previously scored
        if (match.isCompleted && match.homeScore !== null && match.awayScore !== null) {
          const prevHomeWin = match.homeScore > match.awayScore;
          const prevAwayWin = match.awayScore > match.homeScore;
          const prevDraw = match.homeScore === match.awayScore;

          if (match.homePlayerId) {
            await tx.player.update({
              where: { id: match.homePlayerId },
              data: {
                wins: { decrement: prevHomeWin ? 1 : 0 },
                draws: { decrement: prevDraw ? 1 : 0 },
                losses: { decrement: prevAwayWin ? 1 : 0 },
                goalsFor: { decrement: match.homeScore },
                goalsAgainst: { decrement: match.awayScore },
              },
            });
          }

          if (match.awayPlayerId) {
            await tx.player.update({
              where: { id: match.awayPlayerId },
              data: {
                wins: { decrement: prevAwayWin ? 1 : 0 },
                draws: { decrement: prevDraw ? 1 : 0 },
                losses: { decrement: prevHomeWin ? 1 : 0 },
                goalsFor: { decrement: match.awayScore },
                goalsAgainst: { decrement: match.homeScore },
              },
            });
          }
        }

        // Apply new stat contributions
        const isHomeWin = homeScore > awayScore;
        const isAwayWin = awayScore > homeScore;
        const isDraw = homeScore === awayScore;

        await tx.player.update({
          where: { id: homePlayerId },
          data: {
            wins: { increment: isHomeWin ? 1 : 0 },
            draws: { increment: isDraw ? 1 : 0 },
            losses: { increment: isAwayWin ? 1 : 0 },
            goalsFor: { increment: homeScore },
            goalsAgainst: { increment: awayScore },
          },
        });

        await tx.player.update({
          where: { id: awayPlayerId },
          data: {
            wins: { increment: isAwayWin ? 1 : 0 },
            draws: { increment: isDraw ? 1 : 0 },
            losses: { increment: isHomeWin ? 1 : 0 },
            goalsFor: { increment: awayScore },
            goalsAgainst: { increment: homeScore },
          },
        });

        // Update the match record
        const updatedMatch = await tx.match.update({
          where: { id: matchId },
          data: {
            homePlayerId,
            awayPlayerId,
            homeScore,
            awayScore,
            homePenalty,
            awayPenalty,
            isCompleted: true,
            playedAt: playedAt ? new Date(playedAt) : new Date(),
            resultEnteredBy: session.adminId,
          },
          include: {
            homePlayer: true,
            awayPlayer: true,
            competition: true,
          },
        });

        // Knockout auto-advancement
        if (match.bracketSlot !== null) {
          const slotMatches = await tx.match.findMany({
            where: {
              competitionId: compId,
              bracketSlot: match.bracketSlot,
            },
          });

          // Substitute the updated match into slotMatches
          const slotList = slotMatches.map((m) => (m.id === matchId ? updatedMatch : m));

          const resolution = resolveTieWinner(
            slotList.map((m) => ({
              id: m.id,
              homePlayerId: m.homePlayerId,
              awayPlayerId: m.awayPlayerId,
              homeScore: m.homeScore,
              awayScore: m.awayScore,
              homePenalty: m.homePenalty,
              awayPenalty: m.awayPenalty,
              legNumber: m.legNumber,
              bracketSlot: m.bracketSlot,
              isCompleted: m.isCompleted,
            }))
          );

          if (resolution.isDecided && resolution.winnerPlayerId) {
            // Find total bracket size from first round matches
            const allCompMatches = await tx.match.findMany({
              where: { competitionId: compId, bracketSlot: { not: null } },
            });

            // Find max bracket slot
            const maxSlot = allCompMatches.reduce((max, m) => Math.max(max, m.bracketSlot || 0), 0);
            // Bracket size for maxSlot = (maxSlot + 1)
            let bracketSize = 2;
            while (bracketSize - 1 < maxSlot) {
              bracketSize *= 2;
            }

            const { targetSlot, position } = getNextBracketSlot(match.bracketSlot, bracketSize);

            if (targetSlot) {
              const targetMatches = await tx.match.findMany({
                where: { competitionId: compId, bracketSlot: targetSlot },
              });

              for (const tm of targetMatches) {
                await tx.match.update({
                  where: { id: tm.id },
                  data: {
                    ...(position === "home"
                      ? { homePlayerId: resolution.winnerPlayerId }
                      : { awayPlayerId: resolution.winnerPlayerId }),
                  },
                });
              }
            } else {
              // Final match completed! Mark competition completed
              await tx.competition.update({
                where: { id: compId },
                data: { status: "COMPLETED" },
              });
            }
          }
        }

        return updatedMatch;
      });

      await createAuditLog({
        adminId: session.adminId,
        actionType: "ENTER_MATCH_RESULT",
        targetTable: "Match",
        targetId: updated.id,
        newValue: {
          competition: updated.competition.name,
          home: updated.homePlayer?.username,
          away: updated.awayPlayer?.username,
          score: `${homeScore} - ${awayScore}`,
          penalties: homePenalty !== null ? `(${homePenalty} - ${awayPenalty})` : null,
          bracketSlot: updated.bracketSlot,
        },
      });

      revalidatePath(`/competition/${match.competitionId}`);
      revalidatePath("/admin/competitions");
      revalidatePath("/portal");

      return NextResponse.json({ success: true, match: updated });
    }

    // MODE 2: Create a new ad-hoc match (backward compatibility)
    if (!reqCompId || !reqHomeId || !reqAwayId) {
      return NextResponse.json(
        { error: "Competition ID, Home Player, and Away Player are required." },
        { status: 400 }
      );
    }

    if (reqHomeId === reqAwayId) {
      return NextResponse.json({ error: "Home and Away players cannot be the same." }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          competitionId: reqCompId,
          homePlayerId: reqHomeId,
          awayPlayerId: reqAwayId,
          homeScore,
          awayScore,
          homePenalty,
          awayPenalty,
          isCompleted: true,
          playedAt: playedAt ? new Date(playedAt) : new Date(),
          resultEnteredBy: session.adminId,
        },
        include: {
          competition: true,
          homePlayer: true,
          awayPlayer: true,
        },
      });

      const isHomeWin = homeScore > awayScore;
      const isAwayWin = awayScore > homeScore;
      const isDraw = homeScore === awayScore;

      await tx.player.update({
        where: { id: reqHomeId },
        data: {
          wins: { increment: isHomeWin ? 1 : 0 },
          draws: { increment: isDraw ? 1 : 0 },
          losses: { increment: isAwayWin ? 1 : 0 },
          goalsFor: { increment: homeScore },
          goalsAgainst: { increment: awayScore },
        },
      });

      await tx.player.update({
        where: { id: reqAwayId },
        data: {
          wins: { increment: isAwayWin ? 1 : 0 },
          draws: { increment: isDraw ? 1 : 0 },
          losses: { increment: isHomeWin ? 1 : 0 },
          goalsFor: { increment: awayScore },
          goalsAgainst: { increment: homeScore },
        },
      });

      return match;
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "ENTER_MATCH_RESULT",
      targetTable: "Match",
      targetId: created.id,
      newValue: {
        competition: created.competition.name,
        home: created.homePlayer?.username,
        away: created.awayPlayer?.username,
        score: `${homeScore} - ${awayScore}`,
      },
    });

    revalidatePath(`/competition/${reqCompId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal");

    return NextResponse.json({ success: true, match: created });
  } catch (error) {
    console.error("POST /api/admin/matches error:", error);
    return NextResponse.json({ error: "Failed to record match result." }, { status: 500 });
  }
}
