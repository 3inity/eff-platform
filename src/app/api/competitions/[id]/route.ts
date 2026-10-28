import { NextResponse } from "next/server";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            team: true,
            player: {
              select: {
                id: true,
                username: true,
                xHandle: true,
                teamName: true,
                avatarUrl: true,
                nationality: true,
              },
            },
          },
          orderBy: [{ seed: "asc" }, { player: { username: "asc" } }],
        },
        matches: {
          include: {
            homePlayer: {
              select: {
                id: true,
                username: true,
                teamName: true,
                avatarUrl: true,
                nationality: true,
              },
            },
            awayPlayer: {
              select: {
                id: true,
                username: true,
                teamName: true,
                avatarUrl: true,
                nationality: true,
              },
            },
            admin: {
              include: {
                player: {
                  select: { username: true },
                },
              },
            },
          },
          orderBy: { playedAt: "desc" },
        },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // Calculate League Standings for approved participants
    const approvedParticipants = competition.participants.filter(
      (p) => p.status === "APPROVED"
    );

    const standingsMap = new Map<
      string,
      {
        player: (typeof approvedParticipants)[0]["player"];
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
        form: ("W" | "D" | "L")[];
      }
    >();

    for (const part of approvedParticipants) {
      standingsMap.set(part.playerId, {
        player: part.player,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
      });
    }

    // Process all played matches
    // Note: matches are ordered desc by playedAt, so chronologically newest matches come first
    for (const match of competition.matches) {
      const homeEntry = standingsMap.get(match.homePlayerId);
      const awayEntry = standingsMap.get(match.awayPlayerId);

      if (homeEntry) {
        homeEntry.played += 1;
        homeEntry.goalsFor += match.homeScore;
        homeEntry.goalsAgainst += match.awayScore;

        if (match.homeScore > match.awayScore) {
          homeEntry.won += 1;
          homeEntry.points += 3;
          if (homeEntry.form.length < 5) homeEntry.form.push("W");
        } else if (match.homeScore === match.awayScore) {
          homeEntry.drawn += 1;
          homeEntry.points += 1;
          if (homeEntry.form.length < 5) homeEntry.form.push("D");
        } else {
          homeEntry.lost += 1;
          if (homeEntry.form.length < 5) homeEntry.form.push("L");
        }
      }

      if (awayEntry) {
        awayEntry.played += 1;
        awayEntry.goalsFor += match.awayScore;
        awayEntry.goalsAgainst += match.homeScore;

        if (match.awayScore > match.homeScore) {
          awayEntry.won += 1;
          awayEntry.points += 3;
          if (awayEntry.form.length < 5) awayEntry.form.push("W");
        } else if (match.awayScore === match.homeScore) {
          awayEntry.drawn += 1;
          awayEntry.points += 1;
          if (awayEntry.form.length < 5) awayEntry.form.push("D");
        } else {
          awayEntry.lost += 1;
          if (awayEntry.form.length < 5) awayEntry.form.push("L");
        }
      }
    }

    // Convert map to array and sort by Points desc, Goal Difference desc, Goals For desc
    const standings = Array.from(standingsMap.values())
      .map((entry) => ({
        ...entry,
        goalDifference: entry.goalsFor - entry.goalsAgainst,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.player.username.localeCompare(b.player.username);
      });

    return NextResponse.json({
      competition,
      standings,
      participants: competition.participants,
      matches: competition.matches,
    });
  } catch (error) {
    console.error("GET /api/competitions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competition details." },
      { status: 500 }
    );
  }
}
