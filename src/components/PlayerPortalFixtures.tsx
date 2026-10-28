"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swords, Calendar, Clock, Trophy, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { MatchAnalysisModal } from "@/components/MatchAnalysisModal";

export interface PortalMatchFixture {
  id: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePenalty?: number | null;
  awayPenalty?: number | null;
  scheduledAt?: string | null;
  playedAt?: string | null;
  matchday?: number | null;
  stage?: string | null;
  legNumber?: number | null;
  isCompleted?: boolean;
  competition?: {
    id: string;
    name: string;
    season: string;
    format: string;
    badgeKey?: string | null;
    status: string;
  } | null;
  homePlayer?: {
    id: string;
    username: string;
    teamName: string;
    avatarUrl?: string | null;
    nationality?: string | null;
  } | null;
  awayPlayer?: {
    id: string;
    username: string;
    teamName: string;
    avatarUrl?: string | null;
    nationality?: string | null;
  } | null;
}

interface PlayerPortalFixturesProps {
  initialFixtures?: PortalMatchFixture[];
  playerId: string;
}

export function PlayerPortalFixtures({ initialFixtures, playerId }: PlayerPortalFixturesProps) {
  const [fixtures, setFixtures] = useState<PortalMatchFixture[]>(initialFixtures || []);
  const [loading, setLoading] = useState(!initialFixtures);
  const [selectedForPreview, setSelectedForPreview] = useState<{
    homeId: string;
    awayId: string;
    homeName: string;
    awayName: string;
  } | null>(null);

  useEffect(() => {
    if (!initialFixtures) {
      fetch("/api/portal/fixtures")
        .then((r) => r.json())
        .then((data) => {
          if (data.fixtures) setFixtures(data.fixtures);
        })
        .catch((err) => console.error("Failed to load player fixtures:", err))
        .finally(() => setLoading(false));
    }
  }, [initialFixtures]);

  // Find next upcoming match
  const now = new Date().getTime();
  const upcomingMatches = fixtures.filter(
    (f) => !f.isCompleted && f.scheduledAt && new Date(f.scheduledAt).getTime() > now - 2 * 3600 * 1000
  );
  const nextMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null;

  // Group fixtures by competition
  const competitionsMap = new Map<string, { competition: any; matches: PortalMatchFixture[] }>();
  for (const m of fixtures) {
    const compId = m.competition?.id || "other";
    if (!competitionsMap.has(compId)) {
      competitionsMap.set(compId, {
        competition: m.competition || { id: "other", name: "Competition", season: "" },
        matches: [],
      });
    }
    competitionsMap.get(compId)!.matches.push(m);
  }

  const groupedCompetitions = Array.from(competitionsMap.values());

  if (loading) {
    return (
      <div className="p-6 bg-[#0d163a] border border-blue-900/40 rounded-2xl text-center text-xs text-blue-300">
        Loading tournament schedule...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NEXT UPCOMING MATCH HIGHLIGHT CARD */}
      {nextMatch && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#002b49] via-[#004e80] to-[#0a1128] border-2 border-[#00b4ff] p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 bg-[#00b4ff] text-[#0a1128] font-black text-[10px] rounded-full uppercase tracking-widest animate-pulse">
                  Next Match Up
                </span>
                <span className="text-xs font-bold text-blue-200">
                  {nextMatch.competition?.name} • {nextMatch.stage ? nextMatch.stage.replace("_", " ") : `Matchday ${nextMatch.matchday || 1}`}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {nextMatch.homePlayer?.id === playerId
                  ? `VS @${nextMatch.awayPlayer?.username || "Opponent"} (${nextMatch.awayPlayer?.teamName || "Club"})`
                  : `VS @${nextMatch.homePlayer?.username || "Opponent"} (${nextMatch.homePlayer?.teamName || "Club"})`}
              </h3>
              <p className="text-xs text-blue-200 mt-1 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-[#00b4ff]" />
                Kickoff: {nextMatch.scheduledAt ? new Date(nextMatch.scheduledAt).toLocaleString() : "TBD"}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="bg-black/50 border border-blue-400/40 rounded-xl px-4 py-2 text-center">
                <span className="text-[10px] text-blue-300 uppercase font-black tracking-wider block">
                  Kickoff Countdown
                </span>
                <Countdown targetDate={nextMatch.scheduledAt} className="text-white font-mono font-black text-sm" />
              </div>

              {nextMatch.homePlayer && nextMatch.awayPlayer && (
                <button
                  onClick={() =>
                    setSelectedForPreview({
                      homeId: nextMatch.homePlayer!.id,
                      awayId: nextMatch.awayPlayer!.id,
                      homeName: nextMatch.homePlayer!.teamName,
                      awayName: nextMatch.awayPlayer!.teamName,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e5b53e] hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-lg transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Scout Preview
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALL FIXTURES GROUPED BY TOURNAMENT */}
      {groupedCompetitions.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-[#0d163a] rounded-2xl border border-blue-900/40">
          <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-60" />
          <p className="text-xs font-bold text-white">No fixtures scheduled yet.</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Once tournaments you participate in launch their schedule, your matchups and dates will display here.
          </p>
        </div>
      ) : (
        groupedCompetitions.map(({ competition, matches }) => (
          <div
            key={competition.id}
            className="bg-white rounded-2xl border border-blue-900/20 overflow-hidden shadow-lg text-gray-900"
          >
            {/* Tournament Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#0a1128] to-[#101c4e] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 text-[#e5b53e]" />
                <div>
                  <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide text-white">
                    {competition.name}
                  </h4>
                  <span className="text-[10px] text-blue-300 font-mono">
                    {competition.season} • {matches.length} {matches.length === 1 ? "match" : "matches"}
                  </span>
                </div>
              </div>

              {competition.id !== "other" && (
                <Link
                  href={`/competition/${competition.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-[#00b4ff] hover:text-white uppercase tracking-wider transition"
                >
                  Tournament Hub <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Matches List */}
            <div className="divide-y divide-gray-100">
              {matches.map((m) => {
                const isHome = m.homePlayer?.id === playerId;
                const opp = isHome ? m.awayPlayer : m.homePlayer;
                const oppName = opp?.username ? `@${opp.username}` : "Opponent TBD";
                const oppClub = opp?.teamName || "Club TBD";
                const isPlayed = m.isCompleted && m.homeScore !== null && m.awayScore !== null;

                let resultBadge: React.ReactNode = null;
                if (isPlayed) {
                  const myScore = isHome ? m.homeScore! : m.awayScore!;
                  const oppScore = isHome ? m.awayScore! : m.homeScore!;
                  if (myScore > oppScore) {
                    resultBadge = (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded uppercase tracking-wider">
                        WIN
                      </span>
                    );
                  } else if (myScore === oppScore) {
                    resultBadge = (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 font-black text-[10px] rounded uppercase tracking-wider">
                        DRAW
                      </span>
                    );
                  } else {
                    resultBadge = (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-[10px] rounded uppercase tracking-wider">
                        LOSS
                      </span>
                    );
                  }
                }

                return (
                  <div
                    key={m.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50/30 transition text-xs"
                  >
                    {/* Opponent & Status */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 border overflow-hidden flex items-center justify-center shrink-0">
                        {opp?.avatarUrl ? (
                          <img src={opp.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Swords className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-gray-900">{oppName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            ({isHome ? "Home" : "Away"})
                          </span>
                        </div>
                        <span className="text-xs text-blue-900 font-bold block mt-0.5">
                          {oppClub}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {m.stage ? m.stage.replace("_", " ") : m.matchday ? `Matchday ${m.matchday}` : "Fixture"}
                          {m.legNumber ? ` • Leg ${m.legNumber}` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Kickoff / Score / Badges */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        {isPlayed ? (
                          <div className="inline-flex flex-col items-center sm:items-end">
                            <span className="font-mono font-black text-base text-gray-900">
                              {isHome ? `${m.homeScore} - ${m.awayScore}` : `${m.awayScore} - ${m.homeScore}`}
                            </span>
                            {m.homePenalty !== null && m.awayPenalty !== null && (
                              <span className="text-[9px] text-amber-700 font-black">
                                (Pen: {m.homePenalty} - {m.awayPenalty})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col sm:items-end">
                            <span className="text-xs font-bold text-gray-800">
                              {m.scheduledAt
                                ? new Date(m.scheduledAt).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Date TBD"}
                            </span>
                            <span className="text-[10px] text-amber-600 font-black uppercase">
                              Upcoming
                            </span>
                          </div>
                        )}
                      </div>

                      {resultBadge}

                      {/* Preview Button */}
                      {m.homePlayer && m.awayPlayer && (
                        <button
                          onClick={() =>
                            setSelectedForPreview({
                              homeId: m.homePlayer!.id,
                              awayId: m.awayPlayer!.id,
                              homeName: m.homePlayer!.teamName,
                              awayName: m.awayPlayer!.teamName,
                            })
                          }
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#e5b53e] hover:text-gray-950 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 shadow-xs"
                          title="Preview Match Analysis"
                        >
                          <Sparkles className="w-3 h-3 text-[#e5b53e]" /> Preview
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* AI ANALYSIS PREVIEW MODAL */}
      {selectedForPreview && (
        <MatchAnalysisModal
          isOpen={Boolean(selectedForPreview)}
          onClose={() => setSelectedForPreview(null)}
          homeId={selectedForPreview.homeId}
          awayId={selectedForPreview.awayId}
          homeName={selectedForPreview.homeName}
          awayName={selectedForPreview.awayName}
        />
      )}
    </div>
  );
}
