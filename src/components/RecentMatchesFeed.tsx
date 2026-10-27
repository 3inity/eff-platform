"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Trophy, Swords } from "lucide-react";
import { MatchAnalysisModal } from "@/components/MatchAnalysisModal";

export interface MatchItem {
  id: string;
  homeScore: number;
  awayScore: number;
  playedAt: string | Date;
  competition?: {
    id: string;
    name: string;
    badgeKey?: string | null;
  } | null;
  homePlayer: {
    id: string;
    username: string;
    teamName: string;
    clubLogoUrl?: string | null;
    avatarUrl?: string | null;
  };
  awayPlayer: {
    id: string;
    username: string;
    teamName: string;
    clubLogoUrl?: string | null;
    avatarUrl?: string | null;
  };
}

export function RecentMatchesFeed({ matches }: { matches: MatchItem[] }) {
  const [selectedMatch, setSelectedMatch] = useState<{
    homeId: string;
    awayId: string;
    homeName: string;
    awayName: string;
  } | null>(null);

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center shadow-sm">
        <Swords className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-700 font-semibold text-sm">No recorded federation matches yet.</p>
        <p className="text-slate-400 text-xs mt-1">
          Matches entered by match admins will broadcast here in real time.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((m) => {
          const homeCrest = m.homePlayer.clubLogoUrl || m.homePlayer.avatarUrl || "/branding/default-crest.svg";
          const awayCrest = m.awayPlayer.clubLogoUrl || m.awayPlayer.avatarUrl || "/branding/default-crest.svg";

          return (
            <div
              key={m.id}
              className="bg-white text-slate-900 border border-slate-200/80 hover:border-[#00b4ff]/60 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md"
            >
              {/* Competition header */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2 mb-3">
                <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-blue-900">
                  <Trophy className="w-3.5 h-3.5 text-[#e5b53e]" />
                  {m.competition ? (
                    <Link
                      href={`/competition/${m.competition.id}`}
                      className="hover:text-[#00b4ff] hover:underline truncate max-w-[180px]"
                    >
                      {m.competition.name}
                    </Link>
                  ) : (
                    "Official Federation Match"
                  )}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  FT
                </span>
              </div>

              {/* Match Teams & Scoreline */}
              <div className="grid grid-cols-7 items-center gap-2 my-1">
                {/* Home */}
                <div className="col-span-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    <Image
                      src={homeCrest}
                      alt={m.homePlayer.teamName}
                      width={28}
                      height={28}
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/player/${m.homePlayer.username}`}
                      className="text-xs font-black text-slate-900 hover:text-[#00b4ff] transition truncate block"
                    >
                      {m.homePlayer.teamName}
                    </Link>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      @{m.homePlayer.username}
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-1 text-center">
                  <div className="bg-[#0a1128] border border-blue-900 rounded-lg py-1 px-1.5 shadow-inner">
                    <span className="font-mono text-base font-black text-white tracking-widest">
                      {m.homeScore}-{m.awayScore}
                    </span>
                  </div>
                </div>

                {/* Away */}
                <div className="col-span-3 flex items-center justify-end gap-2.5 text-right">
                  <div className="min-w-0">
                    <Link
                      href={`/player/${m.awayPlayer.username}`}
                      className="text-xs font-black text-slate-900 hover:text-[#00b4ff] transition truncate block"
                    >
                      {m.awayPlayer.teamName}
                    </Link>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      @{m.awayPlayer.username}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    <Image
                      src={awayCrest}
                      alt={m.awayPlayer.teamName}
                      width={28}
                      height={28}
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Action footer */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-[11px]">
                <span className="text-slate-400 font-mono">
                  {new Date(m.playedAt).toLocaleDateString()}
                </span>

                <button
                  onClick={() =>
                    setSelectedMatch({
                      homeId: m.homePlayer.id,
                      awayId: m.awayPlayer.id,
                      homeName: m.homePlayer.teamName,
                      awayName: m.awayPlayer.teamName,
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:text-white bg-blue-50 hover:bg-[#00b4ff] border border-blue-200 px-2.5 py-1 rounded-md transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#e5b53e]" />
                  AI Analysis
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMatch && (
        <MatchAnalysisModal
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          homeId={selectedMatch.homeId}
          awayId={selectedMatch.awayId}
          homeName={selectedMatch.homeName}
          awayName={selectedMatch.awayName}
        />
      )}
    </>
  );
}
