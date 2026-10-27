import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Countdown } from "@/components/Countdown";
import { CountryFlag } from "@/components/CountryFlag";
import { CompetitionFixtures } from "@/components/CompetitionFixtures";
import {
  Trophy,
  ArrowRight,
  ArrowLeft,
  Medal,
  Clock,
  Swords,
} from "lucide-react";

interface CompetitionPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 10;

interface StandingRow {
  position: number;
  player: {
    id: string;
    username: string;
    teamName: string;
    nationality?: string | null;
    clubLogoUrl?: string | null;
    avatarUrl?: string | null;
  };
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ("W" | "D" | "L")[];
}

export default async function CompetitionPage({ params }: CompetitionPageProps) {
  const { id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      participants: {
        where: { status: "APPROVED" },
        include: {
          player: true,
          team: true,
        },
      },
      matches: {
        orderBy: { playedAt: "desc" },
        include: {
          homePlayer: {
            select: {
              id: true,
              username: true,
              teamName: true,
              avatarUrl: true,
            },
          },
          awayPlayer: {
            select: {
              id: true,
              username: true,
              teamName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!competition) {
    notFound();
  }

  // Compute standings table for approved participants
  const matches = competition.matches;

  const standings: StandingRow[] = competition.participants.map((part) => {
    const p = part.player;
    let played = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    const matchHistory: { playedAt: Date; result: "W" | "D" | "L" }[] = [];

    matches.forEach((m) => {
      const isHome = m.homePlayerId === p.id;
      const isAway = m.awayPlayerId === p.id;

      if (isHome || isAway) {
        played += 1;
        const myScore = isHome ? m.homeScore : m.awayScore;
        const oppScore = isHome ? m.awayScore : m.homeScore;

        goalsFor += myScore;
        goalsAgainst += oppScore;

        if (myScore > oppScore) {
          wins += 1;
          matchHistory.push({ playedAt: m.playedAt, result: "W" });
        } else if (myScore === oppScore) {
          draws += 1;
          matchHistory.push({ playedAt: m.playedAt, result: "D" });
        } else {
          losses += 1;
          matchHistory.push({ playedAt: m.playedAt, result: "L" });
        }
      }
    });

    const form = matchHistory.slice(0, 5).map((h) => h.result);
    const goalDifference = goalsFor - goalsAgainst;
    const points = wins * 3 + draws * 1;

    const assignedTeamName = part.teamName || part.team?.name || p.teamName;
    const assignedTeamLogo = part.teamLogoUrl || part.team?.logoUrl || p.avatarUrl;

    return {
      position: 0,
      player: {
        id: p.id,
        username: p.username,
        teamName: assignedTeamName,
        nationality: p.nationality,
        clubLogoUrl: assignedTeamLogo,
        avatarUrl: p.avatarUrl,
      },
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
      form,
    };
  });

  // Sort standings: Pts desc -> GD desc -> GF desc -> Wins desc
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return b.wins - a.wins;
  });

  standings.forEach((row, i) => {
    row.position = i + 1;
  });

  const bannerSrc = competition.badgeKey || "/branding/competition-banner.svg";
  const isOpen = competition.status === "REGISTRATION_OPEN";
  const isInProgress = competition.status === "IN_PROGRESS";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1128] via-[#101c4e] to-[#1a237e] text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <Link
          href="/#competitions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-200 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tournaments
        </Link>

        {/* Competition Banner Header */}
        <div className="relative rounded-3xl overflow-hidden border border-blue-800/60 shadow-2xl bg-[#0a1128]">
          <div className="relative h-48 sm:h-64 w-full">
            <Image
              src={bannerSrc}
              alt={competition.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128] via-[#0a1128]/60 to-black/30" />

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-mono font-bold text-[#e5b53e] border border-blue-800/60">
                Season {competition.season}
              </span>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                  isOpen
                    ? "bg-[#00c853] text-white shadow-md"
                    : isInProgress
                    ? "bg-[#00b4ff] text-[#0a1128] shadow-md"
                    : "bg-slate-800 text-slate-200 border border-slate-700"
                }`}
              >
                {isOpen ? "Registration Open" : isInProgress ? "Tournament In Progress" : competition.status}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 -mt-12 relative z-10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e5b53e]">
                  <Trophy className="w-4 h-4" />
                  {competition.type} • {competition.format.replace("_", " ")}
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white mt-1">
                  {competition.name}
                </h1>
                <p className="text-xs text-blue-200 mt-1">
                  {competition.participants.length} Approved Competitors • {competition.matches.length} Scheduled Matches
                </p>
                {competition.description && (
                  <p className="text-xs text-blue-100 max-w-3xl leading-relaxed mt-2 font-medium">
                    {competition.description}
                  </p>
                )}
              </div>

              {isOpen && (
                <Link
                  href="/portal/login"
                  className="flex items-center justify-center gap-2 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-[#00b4ff]/25 transition transform hover:-translate-y-0.5 flex-shrink-0"
                >
                  Register via Portal
                  <ArrowRight className="w-4 h-4 text-[#0a1128]" />
                </Link>
              )}
            </div>

            {/* Collapsible More Info */}
            {competition.additionalInfo && (
              <details className="group bg-[#0a1128]/70 border border-blue-800/60 rounded-xl p-3 text-xs text-blue-200">
                <summary className="font-bold text-xs uppercase tracking-wider text-[#e5b53e] cursor-pointer flex items-center justify-between select-none">
                  <span>More Info & Tournament Guidelines</span>
                  <span className="text-blue-400 group-open:rotate-180 transition-transform text-[10px]">▼</span>
                </summary>
                <div className="mt-2.5 pt-2 border-t border-blue-900/50 text-blue-100 text-xs leading-relaxed whitespace-pre-wrap">
                  {typeof competition.additionalInfo === "string"
                    ? competition.additionalInfo
                    : (competition.additionalInfo as any).notes || JSON.stringify(competition.additionalInfo, null, 2)}
                </div>
              </details>
            )}

            {/* Matchday Countdown Alert */}
            {competition.matchdayEndsAt && (
              <div className="bg-[#0a1128]/90 border border-[#00b4ff]/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-[#00b4ff] flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[#00b4ff]">
                      Active Matchday Countdown
                    </p>
                    <p className="text-xs text-blue-100">
                      All fixtures for this round must be completed before the matchday window expires.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                    Matchday ends in:
                  </span>
                  <Countdown targetDate={competition.matchdayEndsAt} />
                </div>
              </div>
            )}

            {/* Registration Countdown Alert */}
            {isOpen && competition.registrationCloseAt && (
              <div className="bg-[#101c4e] border border-[#00c853]/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-[#00c853] flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[#00c853]">
                      Registration Window Active
                    </p>
                    <p className="text-xs text-blue-100">
                      Submit your roster entry through the Player Portal before time expires.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                    Closes In:
                  </span>
                  <Countdown targetDate={competition.registrationCloseAt} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2-COLUMN LAYOUT: LEAGUE TABLE & FIXTURES */}
        <div className="space-y-10">
          {/* Standings Table (FBref / Premier League style in White Card) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <Medal className="w-5 h-5 text-[#e5b53e]" />
                Official Tournament Standings
              </h2>
              <span className="text-xs text-blue-200 font-mono">
                {competition.format.replace("_", " ")} Table
              </span>
            </div>

            <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a1128] text-white uppercase tracking-wider text-[10px] border-b border-blue-900 font-black">
                    <tr>
                      <th className="py-3 px-3 text-center">Pos</th>
                      <th className="py-3 px-3">Club / Competitor</th>
                      <th className="py-3 px-2 text-center">Nat</th>
                      <th className="py-3 px-2 text-center">P</th>
                      <th className="py-3 px-2 text-center">W</th>
                      <th className="py-3 px-2 text-center">D</th>
                      <th className="py-3 px-2 text-center">L</th>
                      <th className="py-3 px-2 text-center">GF</th>
                      <th className="py-3 px-2 text-center">GA</th>
                      <th className="py-3 px-2 text-center">GD</th>
                      <th className="py-3 px-3 text-center font-black text-[#e5b53e]">Pts</th>
                      <th className="py-3 px-3 text-center">Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {standings.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-400">
                          No approved participants in this tournament yet.
                        </td>
                      </tr>
                    ) : (
                      standings.map((row) => {
                        const crestSrc = row.player.clubLogoUrl || row.player.avatarUrl || "/branding/default-crest.svg";

                        return (
                          <tr
                            key={row.player.id}
                            className="hover:bg-blue-50/60 transition group"
                          >
                            <td className="py-3 px-3 text-center font-bold font-mono text-slate-500">
                              {row.position}
                            </td>
                            <td className="py-3 px-3">
                              <Link
                                href={`/player/${row.player.username}`}
                                className="flex items-center gap-2.5 group"
                              >
                                <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  <Image
                                    src={crestSrc}
                                    alt={row.player.teamName}
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 object-contain"
                                  />
                                </div>
                                <div>
                                  <span className="font-bold text-[#0f172a] group-hover:text-[#00b4ff] transition block">
                                    {row.player.teamName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    @{row.player.username}
                                  </span>
                                </div>
                              </Link>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <CountryFlag countryCode={row.player.nationality} size={16} />
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-slate-700">
                              {row.played}
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-[#00c853]">
                              {row.wins}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-slate-500">
                              {row.draws}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-[#e90052]">
                              {row.losses}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-slate-700">
                              {row.goalsFor}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-slate-700">
                              {row.goalsAgainst}
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold">
                              <span
                                className={
                                  row.goalDifference > 0
                                    ? "text-[#00c853]"
                                    : row.goalDifference < 0
                                    ? "text-[#e90052]"
                                    : "text-slate-600"
                                }
                              >
                                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-black text-sm text-blue-900">
                              {row.points}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {row.form.length === 0 ? (
                                  <span className="text-[10px] text-slate-400">-</span>
                                ) : (
                                  row.form.map((f, i) => (
                                    <span
                                      key={i}
                                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                                        f === "W"
                                          ? "bg-[#00c853] text-white"
                                          : f === "D"
                                          ? "bg-slate-400 text-white"
                                          : "bg-[#e90052] text-white"
                                      }`}
                                    >
                                      {f}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Fixtures & Results Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <Swords className="w-5 h-5 text-[#e5b53e]" />
                Fixtures & Match Results
              </h2>
              <span className="text-xs text-blue-200 font-mono">
                {competition.matches.length} Total Matches
              </span>
            </div>

            <CompetitionFixtures matches={competition.matches} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
