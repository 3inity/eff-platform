import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CountryFlag } from "@/components/CountryFlag";
import {
  Shield,
  Trophy,
  Coins,
  ExternalLink,
  Swords,
  ArrowLeft,
} from "lucide-react";

interface PlayerProfilePageProps {
  params: Promise<{ username: string }>;
}

export const revalidate = 10;

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { username } = await params;

  const player = await prisma.player.findUnique({
    where: { username },
    include: {
      competitionParticipants: {
        include: {
          competition: true,
        },
      },
    },
  });

  if (!player) {
    notFound();
  }

  // Fetch recent 10 matches for this player
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homePlayerId: player.id }, { awayPlayerId: player.id }],
    },
    orderBy: { playedAt: "desc" },
    take: 10,
    include: {
      competition: { select: { id: true, name: true } },
      homePlayer: { select: { id: true, username: true, teamName: true, avatarUrl: true } },
      awayPlayer: { select: { id: true, username: true, teamName: true, avatarUrl: true } },
    },
  });

  // Calculate metrics
  const totalMatches = player.wins + player.draws + player.losses;
  const winRate = totalMatches > 0 ? ((player.wins / totalMatches) * 100).toFixed(1) : "0.0";
  const goalDiff = player.goalsFor - player.goalsAgainst;
  const avgGf = totalMatches > 0 ? (player.goalsFor / totalMatches).toFixed(1) : "0.0";

  // Last 5 form
  const last5 = matches.slice(0, 5).map((m) => {
    const isHome = m.homePlayerId === player.id;
    const myScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    if (myScore > oppScore) return "W";
    if (myScore === oppScore) return "D";
    return "L";
  });

  const avatarSrc = player.avatarUrl || "/branding/eff-logo.svg";
  const crestSrc = player.avatarUrl || "/branding/default-crest.svg";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1128] via-[#101c4e] to-[#1a237e] text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-200 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Federation Overview
        </Link>

        {/* Player Header Card (Dark Navy Hero Card with Gold/Blue Accents) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1128] via-[#101c4e] to-[#1a237e] border border-blue-800/60 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Crest & Avatar combo */}
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-[#e5b53e] p-1 flex items-center justify-center overflow-hidden shadow-xl">
                  <Image
                    src={crestSrc}
                    alt={player.teamName}
                    width={80}
                    height={80}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-[#0a1128] overflow-hidden bg-slate-900 shadow">
                  <Image
                    src={avatarSrc}
                    alt={player.username}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Name & Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    {player.teamName}
                  </h1>
                  <CountryFlag countryCode={player.nationality} size={22} />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200 font-mono">
                  <span className="text-[#00b4ff] font-bold">@{player.username}</span>
                  {player.xHandle && (
                    <a
                      href={`https://x.com/${player.xHandle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-300 hover:text-white transition"
                    >
                      <span>𝕏 {player.xHandle}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <span>•</span>
                  <span>Joined {new Date(player.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Form indicator */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    Form:
                  </span>
                  <div className="flex items-center gap-1">
                    {last5.length === 0 ? (
                      <span className="text-xs text-blue-400 font-mono">No recent games</span>
                    ) : (
                      last5.map((f, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
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
                </div>
              </div>
            </div>

            {/* Coin balance & Rank pill */}
            <div className="bg-[#0a1128]/80 border border-blue-800/80 rounded-2xl p-4 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 shadow-inner">
              <div className="text-left sm:text-right">
                <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
                  Federation Purse
                </p>
                <div className="flex items-center gap-1.5 text-xl font-black text-[#e5b53e] font-mono">
                  <Coins className="w-5 h-5 text-[#e5b53e]" />
                  <span>{player.coins.toLocaleString()} EFF</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#101c4e] border border-blue-700/60 text-blue-200 px-3 py-1 rounded-full">
                <Shield className="w-3 h-3 text-[#00b4ff]" />
                Active Competitor
              </div>
            </div>
          </div>
        </div>

        {/* FBREF STATS BOX GRID (White Cards with subtle blue-gray shadow) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Played</p>
            <p className="text-2xl font-black text-[#0f172a] font-mono mt-1">{totalMatches}</p>
          </div>

          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wins / Draws / Losses</p>
            <p className="text-base font-black font-mono mt-2 text-[#0f172a]">
              <span className="text-[#00c853]">{player.wins}</span> -{" "}
              <span className="text-slate-500">{player.draws}</span> -{" "}
              <span className="text-[#e90052]">{player.losses}</span>
            </p>
          </div>

          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Win Rate</p>
            <p className="text-2xl font-black text-blue-700 font-mono mt-1">{winRate}%</p>
          </div>

          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Goals For / Against</p>
            <p className="text-base font-black font-mono mt-2 text-[#0f172a]">
              {player.goalsFor} <span className="text-slate-400">/</span> {player.goalsAgainst}
            </p>
          </div>

          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Goal Difference</p>
            <p
              className={`text-2xl font-black font-mono mt-1 ${
                goalDiff > 0 ? "text-[#00c853]" : goalDiff < 0 ? "text-[#e90052]" : "text-slate-600"
              }`}
            >
              {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
            </p>
          </div>

          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Goals / Match</p>
            <p className="text-2xl font-black text-[#0f172a] font-mono mt-1">{avgGf}</p>
          </div>
        </div>

        {/* 2 COLUMNS: RECENT MATCHES & REGISTERED COMPETITIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Match History (8 cols) - White Card */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <Swords className="w-5 h-5 text-[#e5b53e]" />
                Recent Match History
              </h2>
              <span className="text-xs text-blue-200 font-mono">Last 10 Games</span>
            </div>

            <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a1128] text-white uppercase tracking-wider text-[10px] border-b border-blue-900 font-black">
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Tournament</th>
                      <th className="py-3 px-3">Opponent</th>
                      <th className="py-3 px-3 text-center">Score</th>
                      <th className="py-3 px-3 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {matches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No official completed matches logged yet.
                        </td>
                      </tr>
                    ) : (
                      matches.map((m) => {
                        const isHome = m.homePlayerId === player.id;
                        const opp = isHome ? m.awayPlayer : m.homePlayer;
                        const myScore = isHome ? m.homeScore : m.awayScore;
                        const oppScore = isHome ? m.awayScore : m.homeScore;

                        let resultLabel = "DRAW";
                        let resultClass = "bg-slate-100 text-slate-600 border-slate-300";
                        if (myScore > oppScore) {
                          resultLabel = "WIN";
                          resultClass = "bg-[#00c853]/15 text-[#00c853] border-[#00c853]/40 font-bold";
                        } else if (myScore < oppScore) {
                          resultLabel = "LOSS";
                          resultClass = "bg-[#e90052]/15 text-[#e90052] border-[#e90052]/40 font-bold";
                        }

                        const oppCrest = opp.avatarUrl || "/branding/default-crest.svg";

                        return (
                          <tr key={m.id} className="hover:bg-blue-50/60 transition">
                            <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                              {new Date(m.playedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3">
                              {m.competition ? (
                                <Link
                                  href={`/competition/${m.competition.id}`}
                                  className="text-blue-900 hover:text-[#00b4ff] font-semibold transition"
                                >
                                  {m.competition.name}
                                </Link>
                              ) : (
                                "Exhibition"
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <Link
                                href={`/player/${opp.username}`}
                                className="flex items-center gap-2 group"
                              >
                                <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  <Image
                                    src={oppCrest}
                                    alt={opp.teamName}
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 object-contain"
                                  />
                                </div>
                                <span className="font-bold text-[#0f172a] group-hover:text-[#00b4ff] transition">
                                  {opp.teamName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({isHome ? "H" : "A"})
                                </span>
                              </Link>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-black text-sm text-[#0f172a]">
                              {myScore} - {oppScore}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase border ${resultClass}`}
                              >
                                {resultLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Registered Tournaments (4 cols) - White Cards */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#e5b53e]" />
                Tournament Roster
              </h2>
              <span className="text-xs text-blue-200 font-mono">
                {player.competitionParticipants.length} Entries
              </span>
            </div>

            <div className="space-y-3">
              {player.competitionParticipants.length === 0 ? (
                <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-6 text-center text-xs shadow-sm">
                  Not currently registered in any active tournaments.
                </div>
              ) : (
                player.competitionParticipants.map((part) => (
                  <Link
                    key={part.id}
                    href={`/competition/${part.competition.id}`}
                    className="block bg-white text-slate-900 border border-slate-200/80 hover:border-[#00b4ff] rounded-2xl p-4 transition shadow-sm group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0f172a] group-hover:text-[#00b4ff] transition">
                        {part.competition.name}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          part.status === "APPROVED"
                            ? "bg-[#00c853]/15 text-[#00c853] border border-[#00c853]/40"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {part.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span>Season {part.competition.season}</span>
                      <span>•</span>
                      <span>{part.competition.format.replace("_", " ")}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
