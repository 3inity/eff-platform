"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, UserPlus, Trash2, Shield, CheckCircle, AlertCircle } from "lucide-react";

interface AdminRecord {
  id: string;
  role: "SUPER_ADMIN" | "MATCH_ADMIN" | "BET_ADMIN" | "PLAYER_ADMIN";
  createdAt: string;
  player: {
    id: string;
    username: string;
    teamName: string;
    avatarUrl: string | null;
  };
}

interface Player {
  id: string;
  username: string;
  teamName: string;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuper, setIsSuper] = useState(true);

  // Appoint form state
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedRole, setSelectedRole] = useState<
    "SUPER_ADMIN" | "MATCH_ADMIN" | "BET_ADMIN" | "PLAYER_ADMIN"
  >("MATCH_ADMIN");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const loadData = async () => {
    try {
      const [adminRes, playersRes] = await Promise.all([
        fetch("/api/admin/admins"),
        fetch("/api/admin/players"),
      ]);

      if (adminRes.status === 403) {
        setIsSuper(false);
        setLoading(false);
        return;
      }

      const adminData = await adminRes.json();
      const playersData = await playersRes.json();

      setAdmins(adminData.admins || []);
      setPlayers(playersData.players || []);
      if (playersData.players?.length > 0 && !selectedPlayerId) {
        setSelectedPlayerId(playersData.players[0].id);
      }
    } catch (err) {
      console.error("Error loading admins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAppoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPOINT",
          playerId: selectedPlayerId,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ text: "Admin privileges successfully granted." });
      loadData();
    } catch (err: unknown) {
      setMsg({ text: err instanceof Error ? err.message : "Failed to appoint admin.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async (adminId: string, username: string) => {
    if (!confirm(`Are you sure you want to dismiss @${username} from administrative duties?`)) return;

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISMISS", adminId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ text: `@${username} has been dismissed.` });
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to dismiss admin.");
    }
  };

  if (!isSuper) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-500/30 rounded-2xl text-center text-red-200">
        <ShieldAlert className="w-12 h-12 mx-auto text-red-500 mb-2" />
        <h2 className="text-xl font-black uppercase tracking-tight">Access Restricted</h2>
        <p className="text-xs text-red-300 mt-1">
          This section is exclusively reserved for the <strong>SUPER_ADMIN</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Federation Staff & Role Delegations
        </h1>
        <p className="text-xs text-gray-400 font-semibold mt-0.5">
          Appoint or revoke specialized administrative duties across match results, registrations, and bets.
        </p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            msg.error
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}
        >
          {msg.error ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          {msg.text}
        </div>
      )}

      {/* Appoint New Admin Form (Card) */}
      <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden border border-blue-900/20 p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#0a1128] mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#e90052]" /> Appoint Administrative Role
        </h2>

        <form onSubmit={handleAppoint} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs font-semibold">
          <div>
            <label className="block text-gray-700 font-bold mb-1">Select Player</label>
            <select
              required
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border rounded-xl"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  @{p.username} ({p.teamName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">Administrative Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-gray-50 border rounded-xl font-bold"
            >
              <option value="MATCH_ADMIN">MATCH_ADMIN (Scorecards & fixtures)</option>
              <option value="BET_ADMIN">BET_ADMIN (Bet settlement & cashouts)</option>
              <option value="PLAYER_ADMIN">PLAYER_ADMIN (Player management & onboarding)</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN (Full system authority)</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#0a1128] hover:bg-[#1a237e] text-white font-black uppercase tracking-wider rounded-xl transition shadow-md disabled:opacity-50"
            >
              {submitting ? "Appointing..." : "Grant Authority"}
            </button>
          </div>
        </form>
      </div>

      {/* Active Admins Roster */}
      <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-[#0a1128] px-6 py-3.5 text-white flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-wider">
            Active Administrative Roles ({admins.length})
          </h3>
          <span className="text-[10px] font-bold text-[#e5b53e] uppercase">
            SUPER_ADMIN Protected
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100 text-gray-700 uppercase text-[10px] font-black">
            <tr>
              <th className="py-3 px-4">Admin Member</th>
              <th className="py-3 px-4">Role Delegation</th>
              <th className="py-3 px-4">Granted On</th>
              <th className="py-3 px-4 text-right">Revocation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-semibold">
            {admins.map((adm) => (
              <tr key={adm.id} className="hover:bg-blue-50/50">
                <td className="py-3 px-4">
                  <span className="font-black text-gray-900 block">
                    @{adm.player.username}
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {adm.player.teamName}
                  </span>
                </td>

                <td className="py-3 px-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                      adm.role === "SUPER_ADMIN"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-blue-100 text-blue-900 border border-blue-200"
                    }`}
                  >
                    {adm.role.replace("_", " ")}
                  </span>
                </td>

                <td className="py-3 px-4 text-gray-500">
                  {new Date(adm.createdAt).toLocaleDateString()}
                </td>

                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleDismiss(adm.id, adm.player.username)}
                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                    title="Dismiss Admin Role"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
