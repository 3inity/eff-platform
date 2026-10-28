"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Trophy, Calendar, Clock, Swords } from "lucide-react";
import { MatchAnalysisModal } from "@/components/MatchAnalysisModal";

export interface MatchFixture {
  id: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePenalty?: number | null;
  awayPenalty?: number | null;
  playedAt?: string | Date | null;
  scheduledAt?: string | Date | null;
  matchday?: number | null;
  stage?: string | null;
  bracketSlot?: number | null;
  legNumber?: number | null;
  isCompleted?: boolean;
  homePlayer?: {
    id: string;
    username: string;
    teamName: string;
    clubLogoUrl?: string | null;
    avatarUrl?: string | null;
    nationality?: string | null;
  } | null;
  awayPlayer?: {
    id: string;
    username: string;
    teamName: string;
    clubLogoUrl?: string | null;
    avatarUrl?: string | null;
    nationality?: string | null;
  } | null;
}

interface CompetitionFixturesProps {
  matches: MatchFixture[];
  format?: string;
  knockoutLegs?: number;
}

const KNOCKOUT_STAGES_ORDER = [
  "ROUND_OF_64",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTERFINAL",
  "SEMIFINAL",
  "THIRD_PLACE",
  "FINAL",
];

export function CompetitionFixtures({
  matches,
  format = "ROUND_ROBIN",
  knockoutLegs = 1,
}: CompetitionFixturesProps) {
  const [selectedMatch, setSelectedMatch] = useState<{
    homeId: string;
    awayId: string;
    homeName: string;
    awayName: string;
  } | null>(null);

  // Filter knockout matches vs group stage matches
  const isKnockoutFormat = format === "KNOCKOUT";
  const isGroupStage = format === "GROUP_STAGE";

  const knockoutMatches = matches.filter(
    (m) =>
      m.stage &&
      KNOCKOUT_STAGES_ORDER.includes(m.stage)
  );

  const groupMatches = matches.filter(
    (m) => m.stage && m.stage.startsWith("GROUP_")
  );

  const roundRobinMatches = matches.filter(
    (m) => !m.stage || (!m.stage.startsWith("GROUP_") && !KNOCKOUT_STAGES_ORDER.includes(m.stage))
  );

  // Group round-robin matches by matchday
  const matchdayGroups = new Map<number, MatchFixture[]>();
  for (const m of (isGroupStage ? [] : roundRobinMatches)) {
    const md = m.matchday || 1;
    if (!matchdayGroups.has(md)) matchdayGroups.set(md, []);
    matchdayGroups.get(md)!.push(m);
  }

  // Group group-stage matches by group name
  const groupStageGroups = new Map<string, MatchFixture[]>();
  for (const m of groupMatches) {
    const grp = m.stage || "GROUP_A";
    if (!groupStageGroups.has(grp)) groupStageGroups.set(grp, []);
    groupStageGroups.get(grp)!.push(m);
  }

  // Knockout rounds ordered
  const knockoutRoundsMap = new Map<string, MatchFixture[]>();
  for (const stageName of KNOCKOUT_STAGES_ORDER) {
    const stageMatches = knockoutMatches.filter((m) => m.stage === stageName);
    if (stageMatches.length > 0) {
      knockoutRoundsMap.set(stageName, stageMatches);
    }
  }

  const renderMatchCard = (m: MatchFixture) => {
    const homeName = m.homePlayer?.username ? `@${m.homePlayer.username}` : "TBD";
    const awayName = m.awayPlayer?.username ? `@${m.awayPlayer.username}` : "TBD";
    const homeTeam = m.homePlayer?.teamName || "Club TBD";
    const awayTeam = m.awayPlayer?.teamName || "Club TBD";
    const homeCrest = m.homePlayer?.clubLogoUrl || m.homePlayer?.avatarUrl || "/branding/default-crest.svg";
    const awayCrest = m.awayPlayer?.clubLogoUrl || m.awayPlayer?.avatarUrl || "/branding/default-crest.svg";
    const isPlayed = Boolean(m.isCompleted && m.homeScore !== null && m.awayScore !== null);

    const kickoffFormatted = m.scheduledAt
      ? new Date(m.scheduledAt).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : m.playedAt
      ? new Date(m.playedAt).toLocaleDateString()
      : "Kickoff TBD";

    return (
      <div
        key={m.id}
        className="bg-white text-slate-900 border border-slate-200/80 hover:border-[#00b4ff]/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-blue-900">
              {m.stage ? m.stage.replace("_", " ") : m.matchday ? `Matchday ${m.matchday}` : "Fixture"}
            </span>
            {m.legNumber && (
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                Leg {m.legNumber}
              </span>
            )}
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${
              isPlayed
                ? "bg-slate-100 text-slate-700 border-slate-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {isPlayed ? "FT" : "TBD"}
          </span>
        </div>

        {/* Match Line */}
        <div className="grid grid-cols-7 items-center gap-2 my-2">
          {/* Home */}
          <div className="col-span-3 flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
              <Image src={homeCrest} alt={homeTeam} width={26} height={26} className="w-5 h-5 object-contain" />
            </div>
            <div className="min-w-0">
              {m.homePlayer ? (
                <Link
                  href={`/player/${m.homePlayer.username}`}
                  className={`text-xs block truncate ${
                    isPlayed && m.homeScore! > m.awayScore! ? "font-black text-emerald-700" : "font-bold text-slate-900"
                  } hover:text-[#00b4ff] transition`}
                >
                  {homeTeam}
                </Link>
              ) : (
                <span className="text-xs font-bold text-slate-400 block truncate">TBD</span>
              )}
              <p className="text-[10px] text-slate-400 font-mono truncate">{homeName}</p>
            </div>
          </div>

          {/* Score / VS Display */}
          <div className="col-span-1 text-center">
            {isPlayed ? (
              <div className="bg-[#0a1128] border border-blue-900 rounded-lg py-1 px-1 shadow-inner">
                <span className="font-mono text-sm font-black text-white">
                  {m.homeScore}-{m.awayScore}
                </span>
                {m.homePenalty !== null && m.awayPenalty !== null && (
                  <span className="block text-[8px] text-amber-300 font-mono">
                    ({m.homePenalty}-{m.awayPenalty})
                  </span>
                )}
              </div>
            ) : (
              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase">
                VS
              </span>
            )}
          </div>

          {/* Away */}
          <div className="col-span-3 flex items-center justify-end gap-2 text-right min-w-0">
            <div className="min-w-0">
              {m.awayPlayer ? (
                <Link
                  href={`/player/${m.awayPlayer.username}`}
                  className={`text-xs block truncate ${
                    isPlayed && m.awayScore! > m.homeScore! ? "font-black text-emerald-700" : "font-bold text-slate-900"
                  } hover:text-[#00b4ff] transition`}
                >
                  {awayTeam}
                </Link>
              ) : (
                <span className="text-xs font-bold text-slate-400 block truncate">TBD</span>
              )}
              <p className="text-[10px] text-slate-400 font-mono truncate">{awayName}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
              <Image src={awayCrest} alt={awayTeam} width={26} height={26} className="w-5 h-5 object-contain" />
            </div>
          </div>
        </div>

        {/* Footer Info & Preview */}
        <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 text-[11px]">
          <span className="text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-500" />
            {kickoffFormatted}
          </span>

          {m.homePlayer && m.awayPlayer ? (
            <button
              onClick={() =>
                setSelectedMatch({
                  homeId: m.homePlayer!.id,
                  awayId: m.awayPlayer!.id,
                  homeName: m.homePlayer!.teamName,
                  awayName: m.awayPlayer!.teamName,
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:text-white bg-blue-50 hover:bg-[#00b4ff] border border-blue-200 px-2.5 py-1 rounded-md transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#e5b53e]" />
              AI Analysis
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">Awaiting Winner</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {matches.length === 0 ? (
        <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center text-xs shadow-sm">
          No matches scheduled for this competition yet.
        </div>
      ) : (
        <>
          {/* KNOCKOUT BRACKET VIEW (For KNOCKOUT competitions or after group stage qualification) */}
          {(isKnockoutFormat || (isGroupStage && knockoutMatches.length > 0)) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-blue-800/40 pb-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#e5b53e]" />
                  Knockout Elimination Bracket
                </h3>
                <span className="text-xs text-blue-200 font-mono">
                  {knockoutLegs === 2 ? "Two-Leg Aggregate" : "Single-Leg Sudden Death"}
                </span>
              </div>

              {/* Bracket Grid Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start overflow-x-auto pb-4">
                {Array.from(knockoutRoundsMap.entries()).map(([stageName, stageMatches]) => (
                  <div key={stageName} className="space-y-3 min-w-[280px]">
                    <div className="px-4 py-2 bg-gradient-to-r from-[#0a1128] to-[#101c4e] rounded-xl border border-blue-800/60 text-center shadow-md">
                      <span className="font-black text-xs uppercase tracking-wider text-white">
                        {stageName.replace("_", " ")}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {stageMatches.map((m) => renderMatchCard(m))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUP STAGE FIXTURES VIEW */}
          {isGroupStage && groupMatches.length > 0 && (
            <div className="space-y-6">
              <div className="border-b border-blue-800/40 pb-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-[#e5b53e]" />
                  Group Stage Fixtures
                </h3>
              </div>

              <div className="space-y-6">
                {Array.from(groupStageGroups.entries()).map(([groupName, gMatches]) => (
                  <div key={groupName} className="space-y-3">
                    <div className="px-4 py-2 bg-[#0d163a] rounded-xl border border-blue-900/40 flex items-center justify-between">
                      <span className="font-black text-xs uppercase tracking-wider text-blue-300">
                        {groupName.replace("_", " ")} Fixtures
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {gMatches.length} matches
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gMatches.map((m) => renderMatchCard(m))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROUND ROBIN MATCHDAY VIEW */}
          {!isKnockoutFormat && !isGroupStage && (
            <div className="space-y-6">
              {Array.from(matchdayGroups.entries()).map(([matchdayNum, mdayMatches]) => (
                <div key={matchdayNum} className="space-y-3">
                  <div className="px-4 py-2 bg-[#0d163a] rounded-xl border border-blue-900/40 flex items-center justify-between">
                    <span className="font-black text-xs uppercase tracking-wider text-blue-300">
                      Matchday {matchdayNum}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {mdayMatches.length} {mdayMatches.length === 1 ? "fixture" : "fixtures"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mdayMatches.map((m) => renderMatchCard(m))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedMatch && (
        <MatchAnalysisModal
          isOpen={Boolean(selectedMatch)}
          onClose={() => setSelectedMatch(null)}
          homeId={selectedMatch.homeId}
          awayId={selectedMatch.awayId}
          homeName={selectedMatch.homeName}
          awayName={selectedMatch.awayName}
        />
      )}
    </div>
  );
}
