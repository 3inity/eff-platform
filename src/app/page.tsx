import React from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Countdown } from "@/components/Countdown";
import { CountryFlag } from "@/components/CountryFlag";
import { RecentMatchesFeed } from "@/components/RecentMatchesFeed";
import {
  Trophy,
  Users,
  Shield,
  ArrowRight,
  BookOpen,
  Sparkles,
  Medal,
} from "lucide-react";

export const revalidate = 10;

export default async function HomePage() {
  // Fetch active/open competitions
  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      participants: {
        where: { status: "APPROVED" },
      },
    },
    take: 6,
  });

  // Find a featured competition with open registration
  const featuredOpenComp = competitions.find(
    (c) => c.status === "REGISTRATION_OPEN" && c.registrationCloseAt
  );

  // Fetch recent matches
  const recentMatches = await prisma.match.findMany({
    orderBy: { playedAt: "desc" },
    include: {
      competition: { select: { id: true, name: true, badgeKey: true } },
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
    take: 6,
  });

  // Fetch top 5 players for the leaderboard preview
  const topPlayers = await prisma.player.findMany({
    orderBy: [{ wins: "desc" }, { goalsFor: "desc" }],
    take: 5,
  });

  // Fetch recent 5 matches for each top player to build form dots
  const playerForms: Record<string, ("W" | "D" | "L")[]> = {};
  for (const p of topPlayers) {
    const matches = await prisma.match.findMany({
      where: {
        isCompleted: true,
        OR: [{ homePlayerId: p.id }, { awayPlayerId: p.id }],
      },
      orderBy: { playedAt: "desc" },
      take: 5,
    });
    playerForms[p.id] = matches.map((m) => {
      const isHome = m.homePlayerId === p.id;
      const myScore = (isHome ? m.homeScore : m.awayScore) ?? 0;
      const oppScore = (isHome ? m.awayScore : m.homeScore) ?? 0;
      if (myScore > oppScore) return "W";
      if (myScore === oppScore) return "D";
      return "L";
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1128] via-[#101c4e] to-[#1a237e] text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* HERO SECTION WITH LOGO, SITE TITLE & FEDERATION INFORMATION */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1128] via-[#101c4e] to-[#1a237e] border border-blue-800/60 p-8 sm:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00b4ff]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#e5b53e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Title, Information & CTAs */}
            <div className="lg:col-span-8 space-y-6">
              {/* Federation Brand Badge */}
              <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-full bg-[#0a1128]/80 border border-[#e5b53e]/50 text-white text-xs font-bold tracking-wider uppercase shadow-md">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#ffe066] to-[#e5b53e] p-0.5 shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#0a1128] flex items-center justify-center">
                    <Image
                      src="/branding/eff-logo.svg"
                      alt="EFF"
                      width={18}
                      height={18}
                      className="w-4 h-4 object-contain"
                    />
                  </div>
                </div>
                <span className="text-[#e5b53e] font-black">EFF</span>
                <span className="text-slate-400">•</span>
                <span className="text-blue-100">Official Einity Football Federation</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight uppercase font-sans">
                WHERE LEGENDS COMPETE FOR{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ffe066] via-[#e5b53e] to-[#ffb300]">
                  FEDERATION GLORY
                </span>
              </h1>

              {/* Information Paragraph */}
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-2xl">
                The premier sanctioned eSports football ecosystem. Featuring real-time tournament tables,
                FBref-grade statistical tracking, automated result verification, and intelligent AI match analysis.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/portal/login"
                  className="flex items-center gap-2 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-sm uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg shadow-[#00b4ff]/25 transition transform hover:-translate-y-0.5"
                >
                  Enter Player Portal
                  <ArrowRight className="w-4 h-4 text-[#0a1128]" />
                </Link>

                <Link
                  href="/rules"
                  className="flex items-center gap-2 bg-[#101c4e] hover:bg-[#1a237e] border border-blue-700/60 text-blue-100 hover:text-white font-bold text-sm tracking-wide px-5 py-3 rounded-xl transition"
                >
                  <BookOpen className="w-4 h-4 text-[#00b4ff]" />
                  Read Official Code
                </Link>
              </div>
            </div>

            {/* Right Column: Federation Crest & Quick Facts Badge */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <div className="relative group p-6 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-blue-400/20 backdrop-blur-md shadow-2xl flex flex-col items-center text-center w-full max-w-xs">
                {/* Large EFF Crest */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-[#ffe066] via-[#e5b53e] to-[#b38600] p-1.5 shadow-2xl shadow-black/50 mb-4 transition transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full bg-[#0a1128] flex items-center justify-center p-3 border border-blue-900/80">
                    <Image
                      src="/branding/eff-logo.svg"
                      alt="Einity Football Federation Crest"
                      width={100}
                      height={100}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain filter drop-shadow-lg"
                      priority
                    />
                  </div>
                </div>

                {/* Identity & Status */}
                <h2 className="text-base font-black tracking-wider text-white uppercase">
                  EINITY FOOTBALL FEDERATION
                </h2>
                <p className="text-[11px] font-semibold text-[#00b4ff] uppercase tracking-widest mt-0.5">
                  The Premier eSports Circuit
                </p>

                {/* Information Badges */}
                <div className="w-full mt-4 pt-4 border-t border-blue-800/60 grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <div className="bg-[#0a1128]/70 border border-blue-800/50 p-2 rounded-xl text-center">
                    <span className="block text-slate-400 uppercase tracking-wider text-[9px]">Circuit</span>
                    <span className="text-[#e5b53e] font-mono">SEASON 2026</span>
                  </div>
                  <div className="bg-[#0a1128]/70 border border-blue-800/50 p-2 rounded-xl text-center">
                    <span className="block text-slate-400 uppercase tracking-wider text-[9px]">Auditing</span>
                    <span className="text-[#00c853] font-mono">IMMUTABLE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURED REGISTRATION BANNER (if open) */}
        {featuredOpenComp && (
          <div className="bg-white text-slate-900 border-2 border-[#00c853]/60 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#00c853]/15 border border-[#00c853]/30 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-8 h-8 text-[#00c853]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00c853] text-white">
                    Registration Open
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    Season {featuredOpenComp.season}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {featuredOpenComp.name}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Format: {featuredOpenComp.format.replace("_", " ")} • {featuredOpenComp.participants.length} players registered
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-center sm:text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Registration Window Closes In:
                </p>
                <div className="mt-1">
                  <Countdown targetDate={featuredOpenComp.registrationCloseAt} />
                </div>
              </div>

              <Link
                href={`/competition/${featuredOpenComp.id}`}
                className="bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md transition"
              >
                View & Register
              </Link>
            </div>
          </div>
        )}

        {/* COMPETITIONS SECTION */}
        <section id="competitions" className="space-y-6">
          <div className="flex items-center justify-between border-b border-blue-800/40 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-wide uppercase text-white flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-[#e5b53e]" />
                Federation Tournaments & Leagues
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                Official sanctioned competitive structures governed by the EFF.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.length === 0 ? (
              <div className="col-span-full bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center text-sm shadow-sm">
                No active competitions currently scheduled. Check back shortly.
              </div>
            ) : (
              competitions.map((comp) => {
                const bannerSrc = comp.badgeKey || "/branding/competition-banner.svg";
                const isOpen = comp.status === "REGISTRATION_OPEN";
                const isInProgress = comp.status === "IN_PROGRESS";

                return (
                  <Link
                    key={comp.id}
                    href={`/competition/${comp.id}`}
                    className="group bg-white text-slate-900 border border-slate-200/80 hover:border-[#00b4ff] rounded-2xl overflow-hidden transition-all flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-1"
                  >
                    {/* Banner Image */}
                    <div className="relative h-36 w-full bg-slate-950 overflow-hidden">
                      <Image
                        src={bannerSrc}
                        alt={comp.name}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isOpen
                              ? "bg-[#00c853] text-white shadow-md"
                              : isInProgress
                              ? "bg-[#00b4ff] text-[#0a1128] shadow-md"
                              : "bg-slate-800 text-slate-200"
                          }`}
                        >
                          {isOpen ? "Open" : isInProgress ? "Live" : comp.status}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[11px] font-mono font-bold text-[#e5b53e] border border-blue-900/60">
                          Season {comp.season}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="font-black text-lg text-slate-900 group-hover:text-[#00b4ff] transition leading-snug">
                          {comp.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 font-medium">
                          <span>{comp.type}</span>
                          <span>•</span>
                          <span>{comp.format.replace("_", " ")}</span>
                        </div>
                      </div>

                      {/* Registration Countdown if open */}
                      {isOpen && comp.registrationCloseAt && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Closes in:
                          </p>
                          <Countdown targetDate={comp.registrationCloseAt} />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                          <Users className="w-3.5 h-3.5 text-[#00b4ff]" />
                          {comp.participants.length} / {comp.maxParticipants || "∞"} Players
                        </span>
                        <span className="text-blue-700 font-bold group-hover:translate-x-1 transition flex items-center gap-1">
                          View Table <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* 2-COLUMN SECTION: FBref LEADERBOARD & RECENT MATCHES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Top Players Table (FBref style) - 7 cols (White Card with subtle shadow) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <Medal className="w-5 h-5 text-[#e5b53e]" />
                Federation Leaderboard
              </h2>
              <span className="text-xs text-blue-200 font-mono">FBref Model</span>
            </div>

            <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a1128] text-white uppercase tracking-wider text-[10px] font-black border-b border-blue-900">
                    <tr>
                      <th className="py-3 px-3 text-center">#</th>
                      <th className="py-3 px-3">Player / Club</th>
                      <th className="py-3 px-2 text-center">Nat</th>
                      <th className="py-3 px-2 text-center">W</th>
                      <th className="py-3 px-2 text-center">D</th>
                      <th className="py-3 px-2 text-center">L</th>
                      <th className="py-3 px-2 text-center">GD</th>
                      <th className="py-3 px-3 text-center">Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {topPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No registered players yet.
                        </td>
                      </tr>
                    ) : (
                      topPlayers.map((player, idx) => {
                        const form = playerForms[player.id] || [];
                        const gd = player.goalsFor - player.goalsAgainst;

                        return (
                          <tr
                            key={player.id}
                            className="hover:bg-blue-50/60 transition group"
                          >
                            <td className="py-3 px-3 text-center font-bold font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <Link
                                href={`/player/${player.username}`}
                                className="block font-bold text-slate-900 group-hover:text-[#00b4ff] transition"
                              >
                                {player.teamName}
                                <span className="block text-[10px] text-slate-500 font-normal font-mono">
                                  @{player.username}
                                </span>
                              </Link>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <CountryFlag countryCode={player.nationality} size={18} />
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-[#00c853] font-mono">
                              {player.wins}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-500 font-mono">
                              {player.draws}
                            </td>
                            <td className="py-3 px-2 text-center text-[#e90052] font-mono">
                              {player.losses}
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold">
                              <span
                                className={
                                  gd > 0
                                    ? "text-[#00c853]"
                                    : gd < 0
                                    ? "text-[#e90052]"
                                    : "text-slate-600"
                                }
                              >
                                {gd > 0 ? `+${gd}` : gd}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {form.length === 0 ? (
                                  <span className="text-[10px] text-slate-400">-</span>
                                ) : (
                                  form.map((f, i) => (
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
          </div>

          {/* Recent Match Results Feed - 5 cols */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#e5b53e]" />
                Latest Fixtures & Scores
              </h2>
              <span className="text-xs text-blue-200 font-mono">Live Broadcast</span>
            </div>

            <RecentMatchesFeed matches={recentMatches} />
          </div>
        </div>

        {/* RULES BANNER CALLOUT */}
        <div className="bg-gradient-to-r from-[#0a1128] to-[#101c4e] border border-blue-800/60 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#e5b53e]">
              <Shield className="w-4 h-4" />
              Federation Governance & Fair Play
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Official 8-Rule Federation Code
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Read the full regulations covering player registration, screenshot proof protocols,
              4-selection minimum accumulator betting, coin prize pools, and dispute resolution.
            </p>
          </div>

          <Link
            href="/rules"
            className="flex-shrink-0 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition hover:scale-105 shadow-md"
          >
            Review Code of Rules
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
