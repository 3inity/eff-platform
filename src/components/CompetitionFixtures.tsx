"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Swords } from "lucide-react";
import { MatchAnalysisModal } from "@/components/MatchAnalysisModal";

export interface MatchFixture {
  id: string;
  homeScore: number;
  awayScore: number;
  playedAt: string | Date;
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

export function CompetitionFixtures({ matches }: { matches: MatchFixture[] }) {
  const [selectedMatch, setSelectedMatch] = useState<{
    homeId: string;
    awayId: string;
    homeName: string;
    awayName: string;
  } | null>(null);

  return (
    <>
      <div className="space-y-4">
        {/* Fixtures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.length === 0 ? (
            <div className="col-span-full bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center text-xs shadow-sm">
              No recorded matches in this competition yet.
            </div>
          ) : (
            matches.map((m) => {
              const homeCrest = m.homePlayer.clubLogoUrl || m.homePlayer.avatarUrl || "/branding/default-crest.svg";
              const awayCrest = m.awayPlayer.clubLogoUrl || m.awayPlayer.avatarUrl || "/branding/default-crest.svg";

              return (
                <div
                  key={m.id}
                  className="bg-white text-slate-900 border border-slate-200/80 hover:border-[#00b4ff]/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2 mb-2">
                    <span className="font-bold uppercase tracking-wider text-blue-900">
                      Match Result
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      FT
                    </span>
                  </div>

                  {/* Match line */}
                  <div className="grid grid-cols-7 items-center gap-2 my-2">
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        <Image
                          src={homeCrest}
                          alt={m.homePlayer.teamName}
                          width={26}
                          height={26}
                          className="w-5 h-5 object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/player/${m.homePlayer.username}`}
                          className="text-xs font-bold text-slate-900 hover:text-[#00b4ff] transition truncate block"
                        >
                          {m.homePlayer.teamName}
                        </Link>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          @{m.homePlayer.username}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-1 text-center">
                      <div className="bg-[#0a1128] border border-blue-900 rounded-lg py-1 px-1 shadow-inner">
                        <span className="font-mono text-sm font-black text-white">
                          {m.homeScore}-{m.awayScore}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-2 text-right">
                      <div className="min-w-0">
                        <Link
                          href={`/player/${m.awayPlayer.username}`}
                          className="text-xs font-bold text-slate-900 hover:text-[#00b4ff] transition truncate block"
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
                          width={26}
                          height={26}
                          className="w-5 h-5 object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 text-[11px]">
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
            })
          )}
        </div>
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
