"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Coins,
  Scale,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  TrendingUp,
  History,
  Clock,
  ArrowDownCircle,
  Shield,
  HelpCircle,
  Trophy,
} from "lucide-react";

interface BetSelection {
  matchId: string;
  homePlayer: string;
  awayPlayer: string;
  pick: "HOME" | "DRAW" | "AWAY";
  pickLabel: string;
  odds: number;
}

interface MatchCandidate {
  id: string;
  competitionId?: string;
  competitionName: string;
  homePlayer: { id: string; name: string; username: string; logoUrl?: string };
  awayPlayer: { id: string; name: string; username: string; logoUrl?: string };
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
}

interface BetRecord {
  id: string;
  stake: number;
  odds: number;
  selections: any;
  status: "PENDING" | "WON" | "LOST" | "CANCELLED";
  payout?: number | null;
  createdAt: string;
}

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function PortalBetsPage() {
  const [balance, setBalance] = useState(0);
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Bet slip state
  const [selectedPicks, setSelectedPicks] = useState<BetSelection[]>([]);
  const [stake, setStake] = useState<number>(300); // Rule: 300 to 500
  const [placingBet, setPlacingBet] = useState(false);

  // Withdrawal state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(1000);
  const [withdrawing, setWithdrawing] = useState(false);

  // Feedback message
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [meRes, betRes, withRes, matchesRes] = await Promise.all([
        fetch("/api/auth/player/me"),
        fetch("/api/portal/bets"),
        fetch("/api/portal/withdrawals"),
        fetch("/api/portal/bets/matches"),
      ]);

      const meData = await meRes.json();
      const betData = await betRes.json();
      const withData = await withRes.json();
      const matchesData = await matchesRes.json();

      if (meData.player) {
        setBalance(meData.player.coins);
      }
      setBets(betData.bets || []);
      setWithdrawals(withData.withdrawals || []);

      const candidates: MatchCandidate[] = matchesData.matches || betData.matches || [];
      setMatches(candidates);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load wallet and betting data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toggle pick selection
  const handleSelectPick = (
    match: MatchCandidate,
    pick: "HOME" | "DRAW" | "AWAY",
    odds: number
  ) => {
    setMessage(null);
    const existingIndex = selectedPicks.findIndex((p) => p.matchId === match.id);

    if (existingIndex > -1) {
      // If clicking the same pick, remove it
      if (selectedPicks[existingIndex].pick === pick) {
        setSelectedPicks(selectedPicks.filter((p) => p.matchId !== match.id));
        return;
      }
      // If different pick for same match, replace it
      const updated = [...selectedPicks];
      updated[existingIndex] = {
        matchId: match.id,
        homePlayer: match.homePlayer.name,
        awayPlayer: match.awayPlayer.name,
        pick,
        pickLabel:
          pick === "HOME"
            ? `${match.homePlayer.name} (Home Win)`
            : pick === "AWAY"
            ? `${match.awayPlayer.name} (Away Win)`
            : "Draw",
        odds,
      };
      setSelectedPicks(updated);
    } else {
      // Add new pick
      setSelectedPicks([
        ...selectedPicks,
        {
          matchId: match.id,
          homePlayer: match.homePlayer.name,
          awayPlayer: match.awayPlayer.name,
          pick,
          pickLabel:
            pick === "HOME"
              ? `${match.homePlayer.name} (Home Win)`
              : pick === "AWAY"
              ? `${match.awayPlayer.name} (Away Win)`
              : "Draw",
          odds,
        },
      ]);
    }
  };

  // Compute total odds (geometric product)
  const totalOdds = selectedPicks.reduce((acc, curr) => acc * curr.odds, 1);
  const potentialPayout = Math.floor(stake * totalOdds);
  const isValidAcca = selectedPicks.length >= 4 && stake >= 300 && stake <= 500;

  const handlePlaceBet = async () => {
    if (!isValidAcca) {
      setMessage({
        type: "error",
        text: "Bet slip must have at least 4 selections and stake between 300 and 500 EFF coins.",
      });
      return;
    }

    if (balance < stake) {
      setMessage({
        type: "error",
        text: `Insufficient coins. You have ${balance} EFF coins, but stake is ${stake}.`,
      });
      return;
    }

    setPlacingBet(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stake,
          odds: parseFloat(totalOdds.toFixed(2)),
          selections: selectedPicks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place bet.");
      }

      setMessage({
        type: "success",
        text: `Acca ticket placed successfully! ${stake} EFF coins deducted. Potential return: ${potentialPayout} EFF.`,
      });
      setSelectedPicks([]);
      await loadData();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to place bet.",
      });
    } finally {
      setPlacingBet(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0) return;

    if (balance < withdrawAmount) {
      setMessage({
        type: "error",
        text: `Insufficient balance for withdrawal. Your balance is ${balance} EFF coins.`,
      });
      return;
    }

    setWithdrawing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: withdrawAmount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit withdrawal request.");
      }

      setMessage({
        type: "success",
        text: `Withdrawal request for ${withdrawAmount} EFF coins submitted for admin approval!`,
      });
      setWithdrawModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to request withdrawal.",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#00b4ff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-blue-200">Loading wallet & accumulator fixtures...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner: Coin Wallet & Cashout Action */}
      <div className="bg-gradient-to-r from-[#0a1128] via-[#101c4e] to-[#1a237e] border border-blue-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00b4ff]">
            <Coins className="w-4 h-4 text-[#e5b53e]" />
            Federation Coin Purse
          </div>
          <h1 className="text-3xl font-black text-white">
            {balance.toLocaleString()} <span className="text-[#e5b53e] text-2xl">EFF</span>
          </h1>
          <p className="text-xs text-blue-200">
            Available for accumulator slips (min 4 legs, 300-500 stake) or verified cashout.
          </p>
        </div>

        <button
          onClick={() => setWithdrawModalOpen(true)}
          className="bg-[#e5b53e] hover:bg-[#d4a32e] text-[#0a1128] font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition shadow-md hover:scale-105 flex items-center gap-2"
        >
          <ArrowDownCircle className="w-4 h-4 text-[#0a1128]" />
          Request Withdrawal
        </button>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm border ${
            message.type === "success"
              ? "bg-[#00c853]/15 text-[#00c853] border-[#00c853]/40"
              : "bg-[#e90052]/15 text-[#e90052] border-[#e90052]/40"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 2-COLUMN BETTING INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Match Fixtures Board (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
            <div>
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#e5b53e]" />
                Acca Fixture Markets
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Pick at least 4 match predictions (Rule 5.1). Stakes strictly 300 to 500 coins.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-300">
              {matches.length} Available Fixtures
            </span>
          </div>

          {/* Matches Board Grouped by Competition */}
          {matches.length === 0 ? (
            <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center text-xs shadow-sm">
              <Scale className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-60" />
              <p className="font-bold text-slate-700">No active match markets available.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Acca markets open automatically when competitions are IN PROGRESS and fixtures are scheduled.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                matches.reduce((acc, m) => {
                  const compName = m.competitionName || "Active Tournament";
                  if (!acc[compName]) acc[compName] = [];
                  acc[compName].push(m);
                  return acc;
                }, {} as Record<string, MatchCandidate[]>)
              ).map(([compName, compMatches]) => (
                <div key={compName} className="space-y-3">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#0a1128] to-[#101c4e] rounded-xl border border-blue-800/60 text-white shadow-xs">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-[#e5b53e]" />
                      <span className="font-black text-xs uppercase tracking-wider text-white">
                        {compName}
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-300 font-mono">
                      {compMatches.length} {compMatches.length === 1 ? "fixture" : "fixtures"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {compMatches.map((m) => {
                      const currentPick = selectedPicks.find((p) => p.matchId === m.id);

                      return (
                        <div
                          key={m.id}
                          className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 hover:border-[#00b4ff]/60 transition"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2">
                            <span className="font-bold text-blue-900 uppercase tracking-wider">
                              {m.competitionName}
                            </span>
                            <span className="text-slate-400 font-mono">Full-Time Result (1X2)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            {/* Teams */}
                            <div className="sm:col-span-6 flex items-center justify-between sm:justify-start gap-4">
                              <div className="flex items-center gap-2.5">
                                {m.homePlayer.logoUrl && (
                                  <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-0.5">
                                    <img src={m.homePlayer.logoUrl} alt={m.homePlayer.name} className="w-full h-full object-contain" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-black text-[#0f172a]">{m.homePlayer.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">@{m.homePlayer.username}</p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-slate-400">VS</span>
                              <div className="flex items-center justify-end sm:justify-start gap-2.5 text-right sm:text-left">
                                <div>
                                  <p className="text-xs font-black text-[#0f172a]">{m.awayPlayer.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">@{m.awayPlayer.username}</p>
                                </div>
                                {m.awayPlayer.logoUrl && (
                                  <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-0.5">
                                    <img src={m.awayPlayer.logoUrl} alt={m.awayPlayer.name} className="w-full h-full object-contain" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Odds 1X2 Buttons */}
                            <div className="sm:col-span-6 grid grid-cols-3 gap-2">
                              <button
                                onClick={() => handleSelectPick(m, "HOME", m.homeOdds)}
                                className={`p-2 rounded-xl text-center border text-xs font-mono font-bold transition ${
                                  currentPick?.pick === "HOME"
                                    ? "bg-[#00b4ff] text-[#0a1128] border-[#00b4ff] shadow-sm font-black"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                                }`}
                              >
                                <span className="block text-[10px] uppercase font-sans text-slate-400">1</span>
                                {m.homeOdds.toFixed(2)}
                              </button>

                              <button
                                onClick={() => handleSelectPick(m, "DRAW", m.drawOdds)}
                                className={`p-2 rounded-xl text-center border text-xs font-mono font-bold transition ${
                                  currentPick?.pick === "DRAW"
                                    ? "bg-[#00b4ff] text-[#0a1128] border-[#00b4ff] shadow-sm font-black"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                                }`}
                              >
                                <span className="block text-[10px] uppercase font-sans text-slate-400">X</span>
                                {m.drawOdds.toFixed(2)}
                              </button>

                              <button
                                onClick={() => handleSelectPick(m, "AWAY", m.awayOdds)}
                                className={`p-2 rounded-xl text-center border text-xs font-mono font-bold transition ${
                                  currentPick?.pick === "AWAY"
                                    ? "bg-[#00b4ff] text-[#0a1128] border-[#00b4ff] shadow-sm font-black"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                                }`}
                              >
                                <span className="block text-[10px] uppercase font-sans text-slate-400">2</span>
                                {m.awayOdds.toFixed(2)}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Accumulator Slip Card (4 cols) */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-900" />
                <h3 className="font-black text-base text-[#0f172a] uppercase tracking-wider">
                  Acca Slip
                </h3>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  selectedPicks.length >= 4
                    ? "bg-[#00c853]/15 text-[#00c853]"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {selectedPicks.length}/4 Picks
              </span>
            </div>

            {/* Selected Picks List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedPicks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Select at least 4 match predictions from the left board to build an accumulator.
                </div>
              ) : (
                selectedPicks.map((pick) => (
                  <div
                    key={pick.matchId}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#0f172a]">{pick.pickLabel}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {pick.homePlayer} vs {pick.awayPlayer}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700">{pick.odds.toFixed(2)}</span>
                      <button
                        onClick={() =>
                          setSelectedPicks(selectedPicks.filter((p) => p.matchId !== pick.matchId))
                        }
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Stake Input & Summary */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Stake (300 - 500 EFF)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={300}
                    max={500}
                    value={stake}
                    onChange={(e) => setStake(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-[#0f172a] focus:ring-2 focus:ring-[#00b4ff] focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setStake(300)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded-lg"
                    >
                      300
                    </button>
                    <button
                      type="button"
                      onClick={() => setStake(500)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded-lg"
                    >
                      500
                    </button>
                  </div>
                </div>
              </div>

              {/* Multiplier & Payout */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Total Odds:</span>
                  <span className="font-bold text-blue-900">{totalOdds.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Stake:</span>
                  <span className="font-bold text-slate-800">{stake} EFF</span>
                </div>
                <div className="flex justify-between text-base font-black text-[#0f172a] pt-1 border-t border-slate-200">
                  <span>Potential Return:</span>
                  <span className="text-[#00c853]">{potentialPayout.toLocaleString()} EFF</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handlePlaceBet}
                disabled={!isValidAcca || placingBet}
                className="w-full py-3 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50"
              >
                {placingBet
                  ? "Placing Ticket..."
                  : selectedPicks.length < 4
                  ? `Select ${4 - selectedPicks.length} More Pick(s)`
                  : "Place Accumulator Bet"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MY BET SLIPS & WITHDRAWALS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Slips History (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
            <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#e5b53e]" />
              My Bet Tickets
            </h2>
            <span className="text-xs text-blue-200 font-mono">{bets.length} Total Slips</span>
          </div>

          <div className="space-y-3">
            {bets.length === 0 ? (
              <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center text-xs shadow-sm">
                No bet slips recorded yet.
              </div>
            ) : (
              bets.map((bet) => {
                const statusColor =
                  bet.status === "WON"
                    ? "bg-[#00c853]/15 text-[#00c853] border-[#00c853]/40"
                    : bet.status === "LOST"
                    ? "bg-[#e90052]/15 text-[#e90052] border-[#e90052]/40"
                    : "bg-blue-50 text-blue-700 border-blue-200";

                return (
                  <div
                    key={bet.id}
                    className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {new Date(bet.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {bet.id.slice(0, 8)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${statusColor}`}
                      >
                        {bet.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Stake</span>
                        <span className="font-bold text-[#0f172a]">{bet.stake} EFF</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Odds</span>
                        <span className="font-bold text-blue-700">{bet.odds.toFixed(2)}x</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          {bet.status === "WON" ? "Paid Out" : "Potential"}
                        </span>
                        <span className="font-black text-[#00c853]">
                          {bet.payout || Math.floor(bet.stake * bet.odds)} EFF
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Withdrawals History (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
            <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#e5b53e]" />
              Withdrawal Queue
            </h2>
            <span className="text-xs text-blue-200 font-mono">{withdrawals.length} Logs</span>
          </div>

          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-6 text-center text-xs shadow-sm">
                No past withdrawal requests.
              </div>
            ) : (
              withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#0f172a]">
                      {w.amount.toLocaleString()} EFF
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        w.status === "APPROVED"
                          ? "bg-[#00c853]/15 text-[#00c853]"
                          : w.status === "REJECTED"
                          ? "bg-[#e90052]/15 text-[#e90052]"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* WITHDRAWAL MODAL */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base uppercase tracking-wider text-[#0f172a]">
                Request Coin Cashout
              </h3>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Coins will be held in administrative escrow until reviewed by an authorized Bet Admin.
              Your current balance is <strong>{balance.toLocaleString()} EFF</strong>.
            </p>

            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Amount to Cashout (EFF)
                </label>
                <input
                  type="number"
                  min={100}
                  max={balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-[#0f172a] focus:ring-2 focus:ring-[#00b4ff] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={withdrawing || withdrawAmount <= 0 || withdrawAmount > balance}
                className="w-full py-3 bg-[#e5b53e] hover:bg-[#d4a32e] text-[#0a1128] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50"
              >
                {withdrawing ? "Submitting Request..." : `Submit Cashout of ${withdrawAmount} EFF`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
