"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  Check,
  Calendar,
  Layers,
  Trash2,
} from "lucide-react";

export type MarketType = "1X2" | "TOTAL_GOALS";
export type BetPick = "HOME" | "DRAW" | "AWAY" | "OVER_3_5" | "UNDER_2_5";

export interface BetSelection {
  matchId: string;
  competitionName: string;
  homePlayer: string;
  awayPlayer: string;
  market: MarketType;
  pick: BetPick;
  pickLabel: string;
  odds: number;
  scheduledAt?: string | null;
  isCompleted?: boolean;
}

export interface MatchCandidate {
  id: string;
  competitionId?: string;
  competitionName: string;
  competitionSeason?: string;
  stage?: string | null;
  matchday?: number | null;
  legNumber?: number | null;
  scheduledAt?: string | null;
  isCompleted?: boolean;
  homePlayer: { id: string; name: string; username: string; logoUrl?: string };
  awayPlayer: { id: string; name: string; username: string; logoUrl?: string };
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  over35Odds: number;
  under25Odds: number;
}

export interface BetRecord {
  id: string;
  stake: number;
  odds: number;
  selections: any;
  status: "PENDING" | "WON" | "LOST" | "CANCELLED";
  payout?: number | null;
  createdAt: string;
}

export interface WithdrawalRecord {
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
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);

  // Accordion open/collapse state for competitions
  const [collapsedComps, setCollapsedComps] = useState<Record<string, boolean>>({});

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

  // Check if a selection's match has become invalid (match started or completed)
  const isSelectionInvalid = (selection: BetSelection): boolean => {
    if (selection.isCompleted) return true;
    const match = matches.find((m) => m.id === selection.matchId);
    if (!match) return false;
    if (match.isCompleted) return true;
    if (match.scheduledAt && new Date(match.scheduledAt).getTime() <= Date.now()) {
      return true;
    }
    return false;
  };

  // Active vs Invalid selections
  const activeSelections = useMemo(() => {
    return selectedPicks.filter((p) => !isSelectionInvalid(p));
  }, [selectedPicks, matches]);

  const invalidSelections = useMemo(() => {
    return selectedPicks.filter((p) => isSelectionInvalid(p));
  }, [selectedPicks, matches]);

  // Total cumulative odds calculated ONLY from active valid selections
  const totalOdds = useMemo(() => {
    if (activeSelections.length === 0) return 1.0;
    const raw = activeSelections.reduce((acc, curr) => acc * curr.odds, 1);
    return parseFloat(raw.toFixed(2));
  }, [activeSelections]);

  const potentialPayout = Math.floor(stake * totalOdds);
  const isValidAcca = activeSelections.length >= 4 && stake >= 300 && stake <= 500;

  // Toggle or replace pick for a fixture
  const handleSelectPick = (
    match: MatchCandidate,
    market: MarketType,
    pick: BetPick,
    odds: number,
    label: string
  ) => {
    setMessage(null);
    const existingIndex = selectedPicks.findIndex((p) => p.matchId === match.id);

    if (existingIndex > -1) {
      // If clicking the same pick, deselect it
      if (selectedPicks[existingIndex].pick === pick) {
        setSelectedPicks(selectedPicks.filter((p) => p.matchId !== match.id));
        return;
      }
      // If different pick for same match, replace it
      const updated = [...selectedPicks];
      updated[existingIndex] = {
        matchId: match.id,
        competitionName: match.competitionName,
        homePlayer: match.homePlayer.name,
        awayPlayer: match.awayPlayer.name,
        market,
        pick,
        pickLabel: label,
        odds,
        scheduledAt: match.scheduledAt,
        isCompleted: match.isCompleted,
      };
      setSelectedPicks(updated);
    } else {
      // Add new pick
      setSelectedPicks([
        ...selectedPicks,
        {
          matchId: match.id,
          competitionName: match.competitionName,
          homePlayer: match.homePlayer.name,
          awayPlayer: match.awayPlayer.name,
          market,
          pick,
          pickLabel: label,
          odds,
          scheduledAt: match.scheduledAt,
          isCompleted: match.isCompleted,
        },
      ]);
    }
  };

  const handleRemovePick = (matchId: string) => {
    setSelectedPicks(selectedPicks.filter((p) => p.matchId !== matchId));
  };

  const handleClearSlip = () => {
    setSelectedPicks([]);
  };

  const toggleCompCollapse = (compName: string) => {
    setCollapsedComps((prev) => ({ ...prev, [compName]: !prev[compName] }));
  };

  const handlePlaceBet = async () => {
    if (!isValidAcca) {
      setMessage({
        type: "error",
        text: "Bet slip must have at least 4 active selections and stake between 300 and 500 EFF coins.",
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
          odds: totalOdds,
          selections: activeSelections,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place bet.");
      }

      setMessage({
        type: "success",
        text: `Acca ticket placed successfully! ${stake} EFF coins deducted. Potential return: ${potentialPayout.toLocaleString()} EFF.`,
      });
      setSelectedPicks([]);
      setMobileSlipOpen(false);
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

  // Group matches by Competition, then by Matchday/Stage
  const groupedMatches = useMemo(() => {
    const comps: Record<
      string,
      {
        competitionId: string;
        competitionName: string;
        competitionSeason?: string;
        subgroups: Record<string, MatchCandidate[]>;
      }
    > = {};

    for (const m of matches) {
      const compKey = m.competitionName || "Active Tournament";
      if (!comps[compKey]) {
        comps[compKey] = {
          competitionId: m.competitionId || compKey,
          competitionName: compKey,
          competitionSeason: m.competitionSeason,
          subgroups: {},
        };
      }
      const subKey = m.matchday
        ? `Matchday ${m.matchday}`
        : m.stage
        ? `Stage: ${m.stage}`
        : "Fixtures";

      if (!comps[compKey].subgroups[subKey]) {
        comps[compKey].subgroups[subKey] = [];
      }
      comps[compKey].subgroups[subKey].push(m);
    }

    return comps;
  }, [matches]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#00b4ff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-blue-200">Loading wallet & sportsbook fixture markets...</p>
      </div>
    );
  }

  // Common Bet Slip Content Component
  const renderBetSlipContent = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-blue-900" />
          <h3 className="font-black text-base text-[#0f172a] uppercase tracking-wider">
            Accumulator Slip
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
              activeSelections.length >= 4
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {activeSelections.length}/4 Picks
          </span>
          {selectedPicks.length > 0 && (
            <button
              onClick={handleClearSlip}
              className="text-slate-400 hover:text-red-600 text-[10px] font-bold flex items-center gap-1 transition"
              title="Clear all selections"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Selected Picks List */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {selectedPicks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <Scale className="w-8 h-8 text-slate-300 mx-auto opacity-70" />
            <p className="font-semibold text-slate-500">Your bet slip is empty</p>
            <p className="text-[11px] text-slate-400">
              Select at least 4 match predictions from the left board to build your accumulator.
            </p>
          </div>
        ) : (
          selectedPicks.map((pick) => {
            const isInvalid = isSelectionInvalid(pick);
            return (
              <div
                key={pick.matchId}
                className={`relative rounded-xl p-3 text-xs border transition ${
                  isInvalid
                    ? "bg-red-50/70 border-red-200 text-slate-600 opacity-80"
                    : "bg-slate-50 border-slate-200/90 text-slate-900 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Status Indicator */}
                    {isInvalid ? (
                      <div
                        className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5"
                        title="Match started or closed"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5"
                        title="Active selection"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-[#0f172a] text-xs">
                          {pick.pickLabel}
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                          {pick.market === "TOTAL_GOALS" ? "Goals" : "1X2"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        {pick.homePlayer} vs {pick.awayPlayer}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {pick.competitionName}
                      </p>
                    </div>
                  </div>

                  {/* Odds and Remove Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono font-black text-xs ${
                        isInvalid ? "text-slate-400 line-through" : "text-blue-700"
                      }`}
                    >
                      {pick.odds.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemovePick(pick.matchId)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition"
                      title="Remove selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isInvalid && (
                  <div className="mt-2 pt-1.5 border-t border-red-200/80 flex items-center gap-1 text-[10px] font-bold text-red-600">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Match closed/started — excluded from odds calculation</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stake & Payout Details */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        {invalidSelections.length > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {invalidSelections.length} invalid selection(s) excluded from the cumulative odds.
            </span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold uppercase text-slate-500">
              Stake (300 - 500 EFF)
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Balance: {balance.toLocaleString()} EFF
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={300}
              max={500}
              value={stake}
              onChange={(e) => setStake(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-[#0f172a] focus:ring-2 focus:ring-[#00b4ff] focus:outline-none"
            />
            <div className="flex gap-1 shrink-0">
              {[300, 400, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStake(amt)}
                  className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition ${
                    stake === amt
                      ? "bg-blue-900 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Multiplier & Payout Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-slate-500">
            <span>Active Selections:</span>
            <span className="font-bold text-[#0f172a]">{activeSelections.length}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Cumulative Odds:</span>
            <span className="font-black text-blue-900 text-sm">{totalOdds.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Total Stake:</span>
            <span className="font-bold text-slate-800">{stake} EFF</span>
          </div>
          <div className="flex justify-between text-sm font-black text-[#0f172a] pt-2 border-t border-slate-200">
            <span>Potential Return:</span>
            <span className="text-[#00c853] text-base">{potentialPayout.toLocaleString()} EFF</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handlePlaceBet}
          disabled={!isValidAcca || placingBet}
          className="w-full py-3.5 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
        >
          {placingBet
            ? "Placing Ticket..."
            : activeSelections.length < 4
            ? `Select ${4 - activeSelections.length} More Pick(s)`
            : stake < 300 || stake > 500
            ? "Stake Must Be 300 - 500 EFF"
            : `Place Acca Ticket (${potentialPayout.toLocaleString()} EFF)`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24 lg:pb-8">
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
            Available for sportsbook accumulator slips (min 4 legs, 300-500 stake) or verified cashout.
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
        {/* Left Column: Match Fixtures Board with Grouped Accordions (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-800/40 pb-3 gap-2">
            <div>
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#e5b53e]" />
                Sportsbook Fixture Markets
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Pick at least 4 match predictions across 1X2 & Over/Under markets. Stakes strictly 300 to 500 EFF.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-300">
                {matches.length} Playable Fixture{matches.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Matches Board Grouped by Competition Accordions */}
          {Object.keys(groupedMatches).length === 0 ? (
            <div className="bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-8 text-center text-xs shadow-sm">
              <Scale className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-60" />
              <p className="font-bold text-slate-700">No active match markets available right now.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Acca markets open automatically when competitions are IN PROGRESS and fixtures are scheduled.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMatches).map(([compName, compData]) => {
                const isCollapsed = !!collapsedComps[compName];
                const totalCompMatches = Object.values(compData.subgroups).reduce(
                  (sum, sub) => sum + sub.length,
                  0
                );

                return (
                  <div
                    key={compName}
                    className="border border-blue-900/60 rounded-2xl overflow-hidden shadow-md bg-gradient-to-b from-[#0a1128]/90 to-[#0e1738]/90"
                  >
                    {/* Collapsible Competition Header Accordion */}
                    <button
                      type="button"
                      onClick={() => toggleCompCollapse(compName)}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#0a1128] via-[#101c4e] to-[#18235a] hover:from-[#0d1636] hover:to-[#1f2d72] transition text-left cursor-pointer border-b border-blue-800/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#e5b53e]/15 border border-[#e5b53e]/30 rounded-lg">
                          <Trophy className="w-4 h-4 text-[#e5b53e]" />
                        </div>
                        <div>
                          <span className="font-black text-sm uppercase tracking-wider text-white block">
                            {compName}
                          </span>
                          {compData.competitionSeason && (
                            <span className="text-[10px] text-blue-300 font-medium">
                              Season: {compData.competitionSeason}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-blue-300 font-mono bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-800/60">
                          {totalCompMatches} {totalCompMatches === 1 ? "fixture" : "fixtures"}
                        </span>
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-blue-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-blue-300" />
                        )}
                      </div>
                    </button>

                    {/* Accordion Body: Subgroups & Fixture Cards */}
                    {!isCollapsed && (
                      <div className="p-4 sm:p-5 space-y-6">
                        {Object.entries(compData.subgroups).map(([subgroupName, subMatches]) => (
                          <div key={subgroupName} className="space-y-3">
                            {/* Matchday / Stage subheader */}
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00b4ff]">
                              <Calendar className="w-3.5 h-3.5 text-[#00b4ff]" />
                              <span>{subgroupName}</span>
                            </div>

                            <div className="space-y-3">
                              {subMatches.map((m) => {
                                const currentPick = selectedPicks.find((p) => p.matchId === m.id);

                                return (
                                  <div
                                    key={m.id}
                                    className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-[#00b4ff]/70 transition space-y-3"
                                  >
                                    {/* Fixture Header */}
                                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2 gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-blue-950 uppercase tracking-wider">
                                          {m.competitionName}
                                        </span>
                                        {m.legNumber && (
                                          <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold text-[9px] rounded">
                                            Leg {m.legNumber}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                                        {m.scheduledAt && (
                                          <span>
                                            {new Date(m.scheduledAt).toLocaleDateString([], {
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Teams Display */}
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                      {/* Matchup */}
                                      <div className="sm:col-span-6 flex items-center justify-between sm:justify-start gap-4">
                                        {/* Home Team */}
                                        <div className="flex items-center gap-2.5">
                                          {m.homePlayer.logoUrl ? (
                                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-xs">
                                              <img
                                                src={m.homePlayer.logoUrl}
                                                alt={m.homePlayer.name}
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                                              {m.homePlayer.name.slice(0, 2).toUpperCase()}
                                            </div>
                                          )}
                                          <div>
                                            <p className="text-xs font-black text-[#0f172a]">
                                              {m.homePlayer.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-mono">
                                              @{m.homePlayer.username}
                                            </p>
                                          </div>
                                        </div>

                                        <span className="text-xs font-black text-slate-300 px-2 py-0.5 rounded bg-slate-100">
                                          VS
                                        </span>

                                        {/* Away Team */}
                                        <div className="flex items-center justify-end sm:justify-start gap-2.5 text-right sm:text-left">
                                          <div>
                                            <p className="text-xs font-black text-[#0f172a]">
                                              {m.awayPlayer.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-mono">
                                              @{m.awayPlayer.username}
                                            </p>
                                          </div>
                                          {m.awayPlayer.logoUrl ? (
                                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-xs">
                                              <img
                                                src={m.awayPlayer.logoUrl}
                                                alt={m.awayPlayer.name}
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                                              {m.awayPlayer.name.slice(0, 2).toUpperCase()}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Market 1: 1X2 Full-Time Result */}
                                      <div className="sm:col-span-6 space-y-1.5">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                                          <span>Full-Time Result (1X2)</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSelectPick(
                                                m,
                                                "1X2",
                                                "HOME",
                                                m.homeOdds,
                                                `${m.homePlayer.name} (Home Win)`
                                              )
                                            }
                                            className={`p-2 rounded-xl text-center border text-xs font-mono font-bold transition flex flex-col items-center justify-center ${
                                              currentPick?.pick === "HOME"
                                                ? "bg-[#00b4ff] text-[#0a1128] border-[#00b4ff] shadow-sm font-black ring-2 ring-[#00b4ff]/40"
                                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                                            }`}
                                          >
                                            <span className="text-[9px] uppercase font-sans text-slate-400 font-bold">
                                              1 (Home)
                                            </span>
                                            <span>{m.homeOdds.toFixed(2)}</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSelectPick(
                                                m,
                                                "1X2",
                                                "DRAW",
                                                m.drawOdds,
                                                "Draw"
                                              )
                                            }
                                            className={`p-2 rounded-xl text-center border text-xs font-mono font-bold transition flex flex-col items-center justify-center ${
                                              currentPick?.pick === "DRAW"
                                                ? "bg-[#00b4ff] text-[#0a1128] border-[#00b4ff] shadow-sm font-black ring-2 ring-[#00b4ff]/40"
                                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                                            }`}
                                          >
                                            <span className="text-[9px] uppercase font-sans text-slate-400 font-bold">
                                              X (Draw)
                                            </span>
                                            <span>{m.drawOdds.toFixed(2)}</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSelectPick(
                                                m,
                                                "1X2",
                                                "AWAY",
                                                m.awayOdds,
                                                `${m.awayPlayer.name} (Away Win)`
                                              )
                                            }
                                            className={`p-2 rounded-xl text-center border text-xs font-mono font-bold transition flex flex-col items-center justify-center ${
                                              currentPick?.pick === "AWAY"
                                                ? "bg-[#00b4ff] text-[#0a1128] border-[#00b4ff] shadow-sm font-black ring-2 ring-[#00b4ff]/40"
                                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                                            }`}
                                          >
                                            <span className="text-[9px] uppercase font-sans text-slate-400 font-bold">
                                              2 (Away)
                                            </span>
                                            <span>{m.awayOdds.toFixed(2)}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Market 2: Total Goals (Over 3.5 / Under 2.5) */}
                                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                        <Flame className="w-3 h-3 text-[#e5b53e]" />
                                        <span>Total Goals Markets</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 sm:w-72">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSelectPick(
                                              m,
                                              "TOTAL_GOALS",
                                              "OVER_3_5",
                                              m.over35Odds,
                                              "Over 3.5 Goals"
                                            )
                                          }
                                          className={`py-1.5 px-3 rounded-xl text-center border text-xs font-mono font-bold transition flex items-center justify-between ${
                                            currentPick?.pick === "OVER_3_5"
                                              ? "bg-[#00b4ff] text-[#0a1128] border-[#00b4ff] shadow-sm font-black ring-2 ring-[#00b4ff]/40"
                                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                                          }`}
                                        >
                                          <span className="text-[10px] uppercase font-sans text-slate-500 font-bold">
                                            Over 3.5
                                          </span>
                                          <span>{m.over35Odds.toFixed(2)}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSelectPick(
                                              m,
                                              "TOTAL_GOALS",
                                              "UNDER_2_5",
                                              m.under25Odds,
                                              "Under 2.5 Goals"
                                            )
                                          }
                                          className={`py-1.5 px-3 rounded-xl text-center border text-xs font-mono font-bold transition flex items-center justify-between ${
                                            currentPick?.pick === "UNDER_2_5"
                                              ? "bg-[#00b4ff] text-[#0a1128] border-[#00b4ff] shadow-sm font-black ring-2 ring-[#00b4ff]/40"
                                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                                          }`}
                                        >
                                          <span className="text-[10px] uppercase font-sans text-slate-500 font-bold">
                                            Under 2.5
                                          </span>
                                          <span>{m.under25Odds.toFixed(2)}</span>
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
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Fixed/Sticky Sportsbook Acca Bet Slip Card (4 cols) */}
        <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-6 shadow-xl space-y-4">
            {renderBetSlipContent()}
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR (Visible only on mobile/tablet) */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#0a1128]/95 backdrop-blur-md border-t border-blue-800/80 p-3.5 z-40 shadow-2xl flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">
              {activeSelections.length} Selection{activeSelections.length === 1 ? "" : "s"}
            </span>
            <span className="text-xs font-mono font-bold text-[#00b4ff]">
              ({totalOdds.toFixed(2)}x)
            </span>
          </div>
          <p className="text-[10px] text-blue-200 font-mono">
            Return: <strong className="text-[#00c853]">{potentialPayout.toLocaleString()} EFF</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMobileSlipOpen(true)}
          className="px-4 py-2 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition"
        >
          View Bet Slip ({selectedPicks.length})
        </button>
      </div>

      {/* MOBILE BET SLIP MODAL DRAWER */}
      {mobileSlipOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase text-slate-400">Mobile Bet Slip</span>
              <button
                type="button"
                onClick={() => setMobileSlipOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderBetSlipContent()}
          </div>
        </div>
      )}

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

                const selectionsArray = Array.isArray(bet.selections) ? bet.selections : [];

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

                    {selectionsArray.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Selections ({selectionsArray.length}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {selectionsArray.map((s: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-slate-50 rounded-lg p-2 border border-slate-100 text-[11px]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800">
                                  {s.pickLabel || s.prediction || s.pick}
                                </span>
                                <span className="font-mono font-bold text-blue-700">
                                  {s.odds ? `${s.odds.toFixed(2)}x` : ""}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                {s.homePlayer && s.awayPlayer
                                  ? `${s.homePlayer} vs ${s.awayPlayer}`
                                  : s.label || s.match || `Match #${idx + 1}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
