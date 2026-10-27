"use client";

import React, { useEffect, useState } from "react";
import {
  Trophy,
  Users,
  Swords,
  Coins,
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    competitionsCount: 0,
    playersCount: 0,
    pendingBetsCount: 0,
    pendingWithdrawalsCount: 0,
    recentLogs: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [compRes, playersRes, betsRes, withRes, auditRes] = await Promise.all([
          fetch("/api/admin/competitions"),
          fetch("/api/admin/players"),
          fetch("/api/admin/bets?status=PENDING"),
          fetch("/api/admin/withdrawals"),
          fetch("/api/admin/audit?limit=5"),
        ]);

        const [comps, players, bets, withs, audit] = await Promise.all([
          compRes.json(),
          playersRes.json(),
          betsRes.json(),
          withRes.json(),
          auditRes.json(),
        ]);

        const pendingWithdrawals = (withs.withdrawals || []).filter(
          (w: any) => w.status === "PENDING"
        );

        setStats({
          competitionsCount: (comps.competitions || []).length,
          playersCount: (players.players || []).length,
          pendingBetsCount: (bets.bets || []).length,
          pendingWithdrawalsCount: pendingWithdrawals.length,
          recentLogs: audit.logs || [],
        });
      } catch (err) {
        console.error("Dashboard stats error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          EFF Control Centre
        </h1>
        <p className="text-sm font-semibold text-gray-400 mt-1">
          Federation operations, competition lifecycle, match scoring & betting settlement.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Competitions */}
        <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl border-l-8 border-[#0a1128]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Competitions
            </span>
            <Trophy className="w-6 h-6 text-[#0a1128]" />
          </div>
          <p className="text-3xl font-black mt-3">
            {loading ? "..." : stats.competitionsCount}
          </p>
          <a
            href="/admin/competitions"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#e90052] uppercase tracking-wider mt-4 hover:underline"
          >
            Manage <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Players */}
        <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl border-l-8 border-[#00ff85]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Total Players
            </span>
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-black mt-3">
            {loading ? "..." : stats.playersCount}
          </p>
          <a
            href="/admin/players"
            className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 uppercase tracking-wider mt-4 hover:underline"
          >
            Directory <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Pending Bets */}
        <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl border-l-8 border-[#e5b53e]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Pending Tickets
            </span>
            <Coins className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-3xl font-black mt-3">
            {loading ? "..." : stats.pendingBetsCount}
          </p>
          <a
            href="/admin/bets"
            className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 uppercase tracking-wider mt-4 hover:underline"
          >
            Settle Bets <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Pending Withdrawals */}
        <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl border-l-8 border-[#e90052]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Cashout Requests
            </span>
            <AlertTriangle className="w-6 h-6 text-[#e90052]" />
          </div>
          <p className="text-3xl font-black mt-3">
            {loading ? "..." : stats.pendingWithdrawalsCount}
          </p>
          <a
            href="/admin/bets"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#e90052] uppercase tracking-wider mt-4 hover:underline"
          >
            Review <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-[#0a1128] via-[#0d163a] to-[#101c4e] rounded-2xl p-6 border border-blue-800/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black uppercase text-white tracking-wide">
            Match Operations & Results
          </h3>
          <p className="text-sm text-gray-300">
            Submit fixture scores directly to automatically update standings, form guides, and player profiles.
          </p>
        </div>
        <a
          href="/admin/matches"
          className="shrink-0 px-6 py-3 bg-[#00ff85] text-[#070b1a] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-[#34ff9d] transition"
        >
          Enter Match Result
        </a>
      </div>

      {/* Recent Audit Trail Preview */}
      <div className="bg-[#0d163a] rounded-2xl border border-blue-900/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#e5b53e]" />
            <h2 className="text-base font-black uppercase tracking-wide text-white">
              Recent Administrative Activity
            </h2>
          </div>
          <a
            href="/admin/audit"
            className="text-xs font-bold text-[#e5b53e] hover:underline"
          >
            View Full Audit Log →
          </a>
        </div>

        {stats.recentLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4">No recent audit log activity.</p>
        ) : (
          <div className="divide-y divide-blue-900/30">
            {stats.recentLogs.map((log: any) => (
              <div
                key={log.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#00ff85] mr-2">
                    {log.actionType.replace(/_/g, " ")}
                  </span>
                  <span className="text-gray-300">
                    on <strong className="text-white">{log.targetTable}</strong>
                  </span>
                  <span className="text-gray-500 ml-2">
                    by @{log.admin?.player?.username || "admin"}
                  </span>
                </div>
                <span className="text-gray-400">
                  {new Date(log.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
