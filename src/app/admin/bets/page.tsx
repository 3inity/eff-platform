"use client";

import React, { useEffect, useState } from "react";
import {
  Coins,
  CheckCircle,
  XCircle,
  Clock,
  ArrowDownToLine,
  User,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface Bet {
  id: string;
  playerId: string;
  stake: number;
  odds: number;
  selections: any;
  status: "PENDING" | "WON" | "LOST" | "CANCELLED";
  payout: number | null;
  createdAt: string;
  player: {
    username: string;
    teamName: string;
    coins: number;
  };
}

interface Withdrawal {
  id: string;
  playerId: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  player: {
    username: string;
    teamName: string;
    coins: number;
  };
}

export default function AdminBetsPage() {
  const [tab, setTab] = useState<"bets" | "withdrawals">("bets");
  const [bets, setBets] = useState<Bet[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [betsRes, withRes] = await Promise.all([
        fetch("/api/admin/bets"),
        fetch("/api/admin/withdrawals"),
      ]);

      const [betsData, withData] = await Promise.all([
        betsRes.json(),
        withRes.json(),
      ]);

      setBets(betsData.bets || []);
      setWithdrawals(withData.withdrawals || []);
    } catch (err) {
      console.error("Error loading bets/withdrawals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSettleBet = async (betId: string, status: "WON" | "LOST") => {
    setActionLoading(betId);
    try {
      const res = await fetch(`/api/admin/bets/${betId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to settle bet ticket.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveWithdrawal = async (withId: string) => {
    setActionLoading(withId);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve withdrawal.");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingBets = bets.filter((b) => b.status === "PENDING").length;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Bets & Cashout Approvals
        </h1>
        <p className="text-xs text-gray-400 font-semibold mt-0.5">
          Settle player accumulator tickets and authorize coin balance cashouts.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-blue-900/40 pb-4">
        <button
          onClick={() => setTab("bets")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
            tab === "bets"
              ? "bg-[#e90052] text-white shadow-lg"
              : "bg-[#0d163a] text-gray-400 hover:text-white"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Betting Slips</span>
          {pendingBets > 0 && (
            <span className="px-2 py-0.5 bg-black/40 text-white rounded-full text-[10px]">
              {pendingBets}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab("withdrawals")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
            tab === "withdrawals"
              ? "bg-[#e90052] text-white shadow-lg"
              : "bg-[#0d163a] text-gray-400 hover:text-white"
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Cashout Requests</span>
          {pendingWithdrawals > 0 && (
            <span className="px-2 py-0.5 bg-black/40 text-white rounded-full text-[10px]">
              {pendingWithdrawals}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BETTING SLIPS */}
      {tab === "bets" && (
        <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a1128] text-white uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-3 text-center">Stake</th>
                <th className="py-3.5 px-3 text-center">Odds</th>
                <th className="py-3.5 px-3 text-center">Potential Payout</th>
                <th className="py-3.5 px-4">Selections</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Settlement Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading tickets...
                  </td>
                </tr>
              ) : bets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No betting tickets found.
                  </td>
                </tr>
              ) : (
                bets.map((bet) => {
                  const selectionsArray = Array.isArray(bet.selections) ? bet.selections : [];
                  const potentialPayout = Math.round(bet.stake * bet.odds);

                  return (
                    <tr key={bet.id} className="hover:bg-blue-50/50">
                      <td className="py-3 px-4">
                        <span className="font-black text-gray-900 block">
                          @{bet.player?.username}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Balance: {bet.player?.coins} coins
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-gray-800">
                        {bet.stake} coins
                      </td>

                      <td className="py-3 px-3 text-center font-black text-blue-900 font-mono">
                        {bet.odds.toFixed(2)}x
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {potentialPayout} coins
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-[11px] text-gray-600 space-y-0.5">
                          {selectionsArray.map((s: any, idx: number) => (
                            <div key={idx} className="truncate">
                              • {s.label || s.match || `Match #${idx + 1}`}:{" "}
                              <strong>{s.prediction || s.pick}</strong> ({s.odd || "1.8"}x)
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {bet.status === "PENDING" && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-black text-[10px] rounded-full uppercase">
                            Pending
                          </span>
                        )}
                        {bet.status === "WON" && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full uppercase">
                            Won (+{bet.payout})
                          </span>
                        )}
                        {bet.status === "LOST" && (
                          <span className="px-2.5 py-1 bg-red-100 text-red-800 font-black text-[10px] rounded-full uppercase">
                            Lost
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {bet.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={actionLoading === bet.id}
                              onClick={() => handleSettleBet(bet.id, "WON")}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition"
                            >
                              Settle WON
                            </button>
                            <button
                              disabled={actionLoading === bet.id}
                              onClick={() => handleSettleBet(bet.id, "LOST")}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg transition"
                            >
                              Settle LOST
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: CASHOUT / WITHDRAWALS */}
      {tab === "withdrawals" && (
        <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a1128] text-white uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-3">Requested Coins</th>
                <th className="py-3.5 px-3">Submitted At</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Loading requests...
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No cashout requests found.
                  </td>
                </tr>
              ) : (
                withdrawals.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/50">
                    <td className="py-3 px-4 font-black text-gray-900">
                      @{item.player?.username}
                    </td>

                    <td className="py-3 px-3 font-black text-amber-700">
                      {item.amount.toLocaleString()} coins
                    </td>

                    <td className="py-3 px-3 text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {item.status === "PENDING" && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-black text-[10px] rounded-full uppercase">
                          Pending Approval
                        </span>
                      )}
                      {item.status === "APPROVED" && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full uppercase">
                          Approved & Recovered
                        </span>
                      )}
                      {item.status === "REJECTED" && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 font-black text-[10px] rounded-full uppercase">
                          Rejected
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.status === "PENDING" ? (
                        <button
                          disabled={actionLoading === item.id}
                          onClick={() => handleApproveWithdrawal(item.id)}
                          className="px-4 py-1.5 bg-[#e90052] hover:bg-[#ff2882] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition"
                        >
                          Approve Cashout
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
