"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X, Swords, Award, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

interface MatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeId: string;
  awayId: string;
  homeName?: string;
  awayName?: string;
}

interface AnalysisData {
  homePlayer: {
    id: string;
    username: string;
    teamName: string;
    clubName: string;
    winRate: number;
    avgGoalsFor: number;
    avgGoalsAgainst: number;
    recentForm: ("W" | "D" | "L")[];
  };
  awayPlayer: {
    id: string;
    username: string;
    teamName: string;
    clubName: string;
    winRate: number;
    avgGoalsFor: number;
    avgGoalsAgainst: number;
    recentForm: ("W" | "D" | "L")[];
  };
  headToHead: {
    totalMatches: number;
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  analysis: string[];
  summary: string;
  predictedWinner: "HOME" | "AWAY" | "DRAW";
  confidenceScore: number;
}

export function MatchAnalysisModal({
  isOpen,
  onClose,
  homeId,
  awayId,
  homeName,
  awayName,
}: MatchAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !homeId || !awayId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/analyze?homeId=${encodeURIComponent(homeId)}&awayId=${encodeURIComponent(awayId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load match analysis.");
        }
        return res.json();
      })
      .then((resData) => {
        if (isMounted) {
          setData(resData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to run analysis.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, homeId, awayId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0a1128] border border-blue-800/60 rounded-2xl p-6 text-white shadow-2xl shadow-black/80 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-900/50 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ffe066] to-[#e5b53e] flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-[#0a1128]" />
            </div>
            <div>
              <h3 className="font-black text-lg tracking-wide uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-[#e5b53e]">
                AI Match Intelligence
              </h3>
              <p className="text-xs text-blue-300">
                Rule-Engine Head-to-Head & Form Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#101c4e] text-blue-300 hover:text-white border border-blue-800/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#00b4ff] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-blue-200 font-semibold animate-pulse">
              Crunching federated stats, form curves, and head-to-head records...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="py-8 px-4 bg-[#e90052]/10 border border-[#e90052]/30 rounded-xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-[#e90052] mx-auto" />
            <p className="text-sm text-rose-200 font-semibold">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* H2H Scoreboard Header */}
            <div className="grid grid-cols-3 items-center bg-[#101c4e] border border-blue-800/60 rounded-xl p-4 text-center">
              <div>
                <p className="text-xs text-blue-300 uppercase font-bold tracking-wider">Home</p>
                <p className="text-base font-black text-white mt-0.5 truncate">
                  {data.homePlayer.teamName || data.homePlayer.clubName || homeName}
                </p>
                <p className="text-xs text-blue-400 font-mono">@{data.homePlayer.username}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {data.homePlayer.recentForm.map((f, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        f === "W"
                          ? "bg-[#00c853] text-white"
                          : f === "D"
                          ? "bg-slate-500 text-white"
                          : "bg-[#e90052] text-white"
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <Swords className="w-6 h-6 text-[#e5b53e] mb-1" />
                <span className="text-xs font-mono font-bold text-[#e5b53e] uppercase tracking-widest">
                  H2H: {data.headToHead.homeWins}-{data.headToHead.draws}-{data.headToHead.awayWins}
                </span>
                <span className="text-[10px] text-blue-300 mt-0.5">
                  {data.headToHead.totalMatches} meetings
                </span>
              </div>

              <div>
                <p className="text-xs text-blue-300 uppercase font-bold tracking-wider">Away</p>
                <p className="text-base font-black text-white mt-0.5 truncate">
                  {data.awayPlayer.teamName || data.awayPlayer.clubName || awayName}
                </p>
                <p className="text-xs text-blue-400 font-mono">@{data.awayPlayer.username}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {data.awayPlayer.recentForm.map((f, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        f === "W"
                          ? "bg-[#00c853] text-white"
                          : f === "D"
                          ? "bg-slate-500 text-white"
                          : "bg-[#e90052] text-white"
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Prediction Banner */}
            <div className="bg-gradient-to-r from-[#101c4e] to-[#1a237e] border border-[#e5b53e]/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-[#e5b53e] flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-200 uppercase font-bold tracking-wider">
                    Federation Predicted Winner
                  </p>
                  <p className="text-lg font-black text-white">
                    {data.predictedWinner === "HOME"
                      ? `${data.homePlayer.teamName} (Home Win)`
                      : data.predictedWinner === "AWAY"
                      ? `${data.awayPlayer.teamName} (Away Win)`
                      : "Honours Even (Draw Expected)"}
                  </p>
                </div>
              </div>
              <div className="text-right sm:border-l sm:border-blue-800/60 sm:pl-4">
                <p className="text-xs text-blue-300 uppercase font-bold">Confidence</p>
                <span className="text-2xl font-black text-[#00c853] font-mono">
                  {data.confidenceScore}%
                </span>
              </div>
            </div>

            {/* Comparative Stat Bars */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#101c4e] p-3 rounded-xl border border-blue-800/40">
                <p className="text-blue-300 font-semibold mb-1">Win Rate</p>
                <div className="flex justify-between font-mono font-bold text-sm">
                  <span className="text-white">{data.homePlayer.winRate}%</span>
                  <span className="text-blue-400">vs</span>
                  <span className="text-white">{data.awayPlayer.winRate}%</span>
                </div>
              </div>

              <div className="bg-[#101c4e] p-3 rounded-xl border border-blue-800/40">
                <p className="text-blue-300 font-semibold mb-1">Avg Goals For (Per Match)</p>
                <div className="flex justify-between font-mono font-bold text-sm">
                  <span className="text-white">{data.homePlayer.avgGoalsFor.toFixed(1)}</span>
                  <span className="text-blue-400">vs</span>
                  <span className="text-white">{data.awayPlayer.avgGoalsFor.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Tactical Observations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#e5b53e] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Key Tactical Metrics & Observations
              </h4>
              <div className="space-y-1.5">
                {data.analysis.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-[#101c4e]/70 border border-blue-900/50 p-2.5 rounded-lg text-xs text-blue-100 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#00c853] flex-shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tactical Summary */}
            <div className="bg-[#101c4e] border-l-4 border-[#e5b53e] p-3.5 rounded-r-lg text-xs text-blue-100 leading-relaxed">
              <span className="font-bold text-[#e5b53e] uppercase tracking-wide mr-1.5">Summary:</span>
              {data.summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
