import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { verifyPlayerToken } from "@/lib/auth-player";
import { AUTH_COOKIES } from "@/lib/constants";
import { CountryFlag } from "@/components/CountryFlag";
import { Countdown } from "@/components/Countdown";
import {
  Trophy,
  Coins,
  ArrowRight,
  TrendingUp,
  Swords,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";

import { PlayerPortalFixtures } from "@/components/PlayerPortalFixtures";

export const revalidate = 0; // dynamic on player login

export default async function PortalDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIES.PLAYER)?.value;

  if (!token) {
    redirect("/portal/login");
  }

  const payload = await verifyPlayerToken(token);
  if (!payload || !payload.playerId) {
    redirect("/portal/login");
  }

  if (payload.mustChangePassword) {
    redirect("/portal/change-password");
  }

  const player = await prisma.player.findUnique({
    where: { id: payload.playerId },
    include: {
      competitionParticipants: {
        include: {
          competition: true,
          team: true,
        },
      },
      bets: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!player) {
    redirect("/portal/login");
  }

  // Fetch recent completed matches for form dots
  const recentMatches = await prisma.match.findMany({
    where: {
      isCompleted: true,
      OR: [{ homePlayerId: player.id }, { awayPlayerId: player.id }],
    },
    orderBy: { playedAt: "desc" },
    take: 5,
  });

  const last5 = recentMatches.map((m) => {
    const isHome = m.homePlayerId === player.id;
    const myScore = (isHome ? m.homeScore : m.awayScore) ?? 0;
    const oppScore = (isHome ? m.awayScore : m.homeScore) ?? 0;
    if (myScore > oppScore) return "W";
    if (myScore === oppScore) return "D";
    return "L";
  });

  const totalMatches = player.wins + player.draws + player.losses;
  const winRate = totalMatches > 0 ? ((player.wins / totalMatches) * 100).toFixed(1) : "0.0";
  const goalDiff = player.goalsFor - player.goalsAgainst;

  const crestSrc = player.avatarUrl || "/branding/default-crest.svg";

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1128] via-[#101c4e] to-[#1a237e] border border-blue-800/60 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-[#e5b53e] p-1 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
              <Image
                src={crestSrc}
                alt={player.teamName}
                width={70}
                height={70}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#00b4ff] uppercase tracking-wider">
                  Competitor Dashboard
                </span>
                <CountryFlag countryCode={player.nationality} size={16} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                {player.teamName}
              </h1>
              <p className="text-xs text-blue-200 font-mono mt-0.5">
                @{player.username} • {player.xHandle}
              </p>
            </div>
          </div>

          {/* Balance & Actions */}
          <div className="bg-[#0a1128]/80 border border-blue-800/80 rounded-2xl p-4 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shadow-inner">
            <div className="text-left sm:text-right">
              <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
                My Coin Balance
              </p>
              <div className="flex items-center gap-1.5 text-2xl font-black text-[#e5b53e] font-mono">
                <Coins className="w-6 h-6 text-[#e5b53e]" />
                <span>{player.coins.toLocaleString()} EFF</span>
              </div>
            </div>
            <Link
              href="/portal/bets"
              className="bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition shadow-md hover:scale-105"
            >
              Bet & Withdraw
            </Link>
          </div>
        </div>
      </div>

      {/* KPI STATS ROW (White cards with subtle blue-gray shadow) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Record (W-D-L)</p>
          <p className="text-2xl font-black font-mono mt-1 text-[#0f172a]">
            <span className="text-[#00c853]">{player.wins}</span> -{" "}
            <span className="text-slate-500">{player.draws}</span> -{" "}
            <span className="text-[#e90052]">{player.losses}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{totalMatches} matches logged</p>
        </div>

        <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Win Rate</p>
          <p className="text-2xl font-black font-mono mt-1 text-blue-700">{winRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">Federation percentage</p>
        </div>

        <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Goal Differential</p>
          <p
            className={`text-2xl font-black font-mono mt-1 ${
              goalDiff > 0 ? "text-[#00c853]" : goalDiff < 0 ? "text-[#e90052]" : "text-slate-700"
            }`}
          >
            {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {player.goalsFor} scored / {player.goalsAgainst} conceded
          </p>
        </div>

        <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Form Guide</p>
          <div className="flex items-center gap-1.5 mt-2.5">
            {last5.length === 0 ? (
              <span className="text-xs text-slate-400">No recent matches</span>
            ) : (
              last5.map((f, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs ${
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
          <p className="text-[11px] text-slate-400 mt-1.5">Last 5 fixtures</p>
        </div>
      </div>

      {/* MY TEAMS SECTION (Per-competition club assignments) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
          <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00b4ff]" />
            My Teams (Per-Competition Identity)
          </h2>
          <span className="text-xs text-blue-200">
            {player.competitionParticipants.length} Tournaments Enrolled
          </span>
        </div>

        {player.competitionParticipants.length === 0 ? (
          <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-6 text-center shadow-sm">
            <p className="text-xs text-slate-500 font-medium">
              You are not currently enrolled in any competitions. Join a tournament to receive your club team assignment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {player.competitionParticipants.map((part) => {
              const comp = part.competition;
              const teamName = part.teamName || part.team?.name || player.teamName;
              const teamLogo = part.teamLogoUrl || part.team?.logoUrl || "/branding/default-crest.svg";

              return (
                <div
                  key={part.id}
                  className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 hover:border-[#00b4ff] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-inner">
                      <Image
                        src={teamLogo}
                        alt={teamName}
                        width={36}
                        height={36}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">
                        {comp.name}
                      </span>
                      <h4 className="font-black text-sm text-[#0f172a] leading-tight">
                        {teamName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Status: {part.status}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/competition/${comp.id}`}
                    className="p-2 bg-slate-50 hover:bg-[#00b4ff] hover:text-[#0a1128] rounded-xl text-slate-600 transition shrink-0"
                    title="View Tournament"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MY FIXTURES & MATCH SCHEDULE SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
          <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#e5b53e]" />
            My Fixtures & Tournament Matches
          </h2>
          <Link
            href="/portal/competitions"
            className="text-xs font-bold text-[#00b4ff] hover:underline"
          >
            All Competitions →
          </Link>
        </div>

        <PlayerPortalFixtures playerId={player.id} />
      </section>

      {/* 2-COLUMN SECTION: ACTIVE TOURNAMENTS & RECENT BETS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Active Competitions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
            <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#e5b53e]" />
              My Registered Competitions
            </h2>
            <Link
              href="/portal/competitions"
              className="text-xs font-bold text-[#00b4ff] hover:underline"
            >
              Browse Tournaments →
            </Link>
          </div>

          <div className="space-y-3">
            {player.competitionParticipants.length === 0 ? (
              <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center shadow-sm space-y-3">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  You are not currently enrolled in any competitions.
                </p>
                <Link
                  href="/portal/competitions"
                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase bg-[#00b4ff] text-[#0a1128] px-4 py-2 rounded-xl shadow-sm"
                >
                  Join a Tournament Now
                </Link>
              </div>
            ) : (
              player.competitionParticipants.map((part) => {
                const comp = part.competition;
                const isOpen = comp.status === "REGISTRATION_OPEN";

                return (
                  <div
                    key={part.id}
                    className="bg-white text-slate-900 border border-slate-200/80 hover:border-[#00b4ff] rounded-2xl p-5 shadow-sm transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#0f172a]">
                          {comp.name}
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
                      <p className="text-xs text-slate-500 mt-1">
                        Season {comp.season} • {comp.format.replace("_", " ")}
                      </p>
                      {isOpen && comp.registrationCloseAt && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Registration closes:
                          </span>
                          <Countdown targetDate={comp.registrationCloseAt} />
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/competition/${comp.id}`}
                      className="bg-slate-100 hover:bg-[#00b4ff] hover:text-[#0a1128] text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1 self-end sm:self-auto"
                    >
                      View Table <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Bets (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
            <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#e5b53e]" />
              Recent Bet Slips
            </h2>
            <Link
              href="/portal/bets"
              className="text-xs font-bold text-[#00b4ff] hover:underline"
            >
              New Slip →
            </Link>
          </div>

          <div className="space-y-3">
            {player.bets.length === 0 ? (
              <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center shadow-sm space-y-3">
                <Coins className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No bets placed yet.</p>
                <Link
                  href="/portal/bets"
                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase bg-[#00b4ff] text-[#0a1128] px-4 py-2 rounded-xl shadow-sm"
                >
                  Create 4-Leg Acca
                </Link>
              </div>
            ) : (
              player.bets.map((bet) => {
                const statusColor =
                  bet.status === "WON"
                    ? "bg-[#00c853]/15 text-[#00c853] border-[#00c853]/40"
                    : bet.status === "LOST"
                    ? "bg-[#e90052]/15 text-[#e90052] border-[#e90052]/40"
                    : "bg-blue-50 text-blue-700 border-blue-200";

                return (
                  <div
                    key={bet.id}
                    className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {new Date(bet.createdAt).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${statusColor}`}
                      >
                        {bet.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Stake
                        </span>
                        <span className="font-mono font-bold text-sm text-[#0f172a]">
                          {bet.stake} EFF
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Odds
                        </span>
                        <span className="font-mono font-bold text-sm text-blue-700">
                          {bet.odds.toFixed(2)}x
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Return
                        </span>
                        <span className="font-mono font-black text-sm text-[#e5b53e]">
                          {Math.floor(bet.stake * bet.odds)} EFF
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
