"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Coins,
  Edit,
  Trash2,
  Search,
  Upload,
  Copy,
  Check,
  AlertCircle,
  X,
  Shield,
} from "lucide-react";

interface Player {
  id: string;
  username: string;
  xHandle: string;
  teamName: string;
  avatarUrl: string | null;
  nationality: string | null;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  coins: number;
  createdAt: string;
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [coinPlayer, setCoinPlayer] = useState<Player | null>(null);
  const [deletePlayer, setDeletePlayer] = useState<Player | null>(null);
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    username: string;
    tempPass: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New player inputs
  const [newUsername, setNewUsername] = useState("");
  const [newXHandle, setNewXHandle] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newNationality, setNewNationality] = useState("NG");
  const [newCoins, setNewCoins] = useState("0");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");

  // Coin adjustment inputs
  const [coinAmount, setCoinAmount] = useState("");
  const [coinMode, setCoinMode] = useState<"ADD" | "SUBTRACT" | "SET">("ADD");
  const [coinReason, setCoinReason] = useState("");

  const loadPlayers = async () => {
    try {
      const res = await fetch("/api/admin/players");
      const data = await res.json();
      setPlayers(data.players || []);
    } catch (err) {
      console.error("Failed to load players:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  // Upload handler
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: string,
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onSuccess(data.url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "File upload failed.");
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          xHandle: newXHandle,
          teamName: newTeamName,
          nationality: newNationality,
          coins: parseInt(newCoins, 10) || 0,
          avatarUrl: newAvatarUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create player.");

      setCreateOpen(false);
      // Reset form
      setNewUsername("");
      setNewXHandle("");
      setNewTeamName("");
      setNewCoins("0");
      setNewAvatarUrl("");

      // Open temp password banner
      setTempPasswordModal({
        username: data.player.username,
        tempPass: data.tempPassword,
      });

      loadPlayers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error creating player.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlayer) return;
    setFormLoading(true);

    try {
      const res = await fetch(`/api/admin/players/${editPlayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPlayer),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update player.");

      setEditPlayer(null);
      loadPlayers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update player.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!deletePlayer) return;
    setFormLoading(true);

    try {
      const res = await fetch(`/api/admin/players/${deletePlayer.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete player.");

      setDeletePlayer(null);
      loadPlayers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete player.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinPlayer) return;
    setFormLoading(true);

    try {
      const res = await fetch(`/api/admin/players/${coinPlayer.id}/coins`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: coinAmount,
          mode: coinMode,
          reason: coinReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust coins.");

      setCoinPlayer(null);
      setCoinAmount("");
      setCoinReason("");
      loadPlayers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to adjust coins.");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredPlayers = players.filter(
    (p) =>
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      p.teamName.toLowerCase().includes(search.toLowerCase()) ||
      p.xHandle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            Players Directory
          </h1>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Manage registrations, temporary passwords, club logos, and coin balances.
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#e90052] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-[#ff2882] transition"
        >
          <Plus className="w-4 h-4" /> Add New Player
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by username, club name, or X handle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#0d163a] border border-blue-900/40 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e90052]"
        />
      </div>

      {/* Players Table (FBref / Premier League style) */}
      <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a1128] text-white uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-3">X Handle</th>
                <th className="py-3.5 px-3">Default Team</th>
                <th className="py-3.5 px-3 text-center">MP</th>
                <th className="py-3.5 px-3 text-center">W-D-L</th>
                <th className="py-3.5 px-3 text-center">GF-GA</th>
                <th className="py-3.5 px-3 text-center">Coins</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Loading players database...
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No players found.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const mp = player.wins + player.draws + player.losses;
                  return (
                    <tr key={player.id} className="hover:bg-blue-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-300 overflow-hidden shrink-0 flex items-center justify-center">
                            {player.avatarUrl ? (
                              <img
                                src={player.avatarUrl}
                                alt={player.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-black text-gray-900 block">
                              {player.username}
                            </span>
                            {player.nationality && (
                              <span className="text-[10px] text-gray-500 uppercase">
                                Flag: {player.nationality}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">
                        {player.xHandle}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-gray-800">
                          {player.teamName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-gray-700">
                        {mp}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-emerald-700 font-bold">{player.wins}</span> -{" "}
                        <span className="text-gray-500">{player.draws}</span> -{" "}
                        <span className="text-red-600">{player.losses}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600">
                        {player.goalsFor}:{player.goalsAgainst}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          {player.coins.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setCoinPlayer(player)}
                          title="Adjust Coins"
                          className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition"
                        >
                          <Coins className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditPlayer(player)}
                          title="Edit Profile & Stats"
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletePlayer(player)}
                          title="Delete Player"
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ONE-TIME TEMPORARY PASSWORD MODAL */}
      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border-4 border-[#e5b53e]">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <Shield className="w-8 h-8 text-[#e5b53e]" />
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight text-gray-900">
                  Player Registered!
                </h3>
                <p className="text-xs font-bold text-gray-500">
                  Account created for @{tempPasswordModal.username}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <p className="text-xs font-black uppercase text-amber-800 tracking-wider mb-2">
                ⚠️ Temporary Password (Shown Once):
              </p>
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-amber-300 font-mono text-base font-bold text-gray-900">
                <span>{tempPasswordModal.tempPass}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tempPasswordModal.tempPass);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-[#0a1128] text-white rounded hover:bg-[#1a237e] transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-6">
              Send this temporary password to the player. Upon logging in to{" "}
              <strong>/portal</strong>, they will be forced to set their permanent
              password (minimum 8 characters).
            </p>

            <button
              onClick={() => setTempPasswordModal(null)}
              className="w-full py-3 bg-[#0a1128] text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#1a237e] transition"
            >
              I Have Saved This Password
            </button>
          </div>
        </div>
      )}

      {/* CREATE PLAYER MODAL */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-black text-lg uppercase tracking-tight text-gray-900">
                Register New Player
              </h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePlayer} className="space-y-4 mt-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. victor_osimhen"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    X Handle *
                  </label>
                  <input
                    type="text"
                    required
                    value={newXHandle}
                    onChange={(e) => setNewXHandle(e.target.value)}
                    placeholder="@victor_x"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Default Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Napoli / Real Madrid"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Nationality (2-Letter ISO)
                  </label>
                  <select
                    value={newNationality}
                    onChange={(e) => setNewNationality(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="NG">Nigeria (NG)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="GH">Ghana (GH)</option>
                    <option value="ZA">South Africa (ZA)</option>
                    <option value="FR">France (FR)</option>
                    <option value="BR">Brazil (BR)</option>
                    <option value="ES">Spain (ES)</option>
                    <option value="DE">Germany (DE)</option>
                    <option value="IT">Italy (IT)</option>
                    <option value="PT">Portugal (PT)</option>
                    <option value="AR">Argentina (AR)</option>
                    <option value="US">United States (US)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Initial Coins
                  </label>
                  <input
                    type="number"
                    value={newCoins}
                    onChange={(e) => setNewCoins(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Player Avatar (Image upload to eff-assets)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(e, "avatars", (url) => setNewAvatarUrl(url))
                    }
                    className="text-xs"
                  />
                  {newAvatarUrl && (
                    <img
                      src={newAvatarUrl}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-[#e90052] text-white font-bold rounded-lg hover:bg-[#ff2882] transition disabled:opacity-50"
                >
                  {formLoading ? "Registering..." : "Create & Generate Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAYER MODAL */}
      {editPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-black text-lg uppercase tracking-tight text-gray-900">
                Edit Player: @{editPlayer.username}
              </h3>
              <button
                onClick={() => setEditPlayer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePlayer} className="space-y-4 mt-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">X Handle</label>
                  <input
                    type="text"
                    value={editPlayer.xHandle}
                    onChange={(e) =>
                      setEditPlayer({ ...editPlayer, xHandle: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Team Name</label>
                  <input
                    type="text"
                    value={editPlayer.teamName}
                    onChange={(e) =>
                      setEditPlayer({ ...editPlayer, teamName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Nationality</label>
                <input
                  type="text"
                  maxLength={2}
                  value={editPlayer.nationality || ""}
                  onChange={(e) =>
                    setEditPlayer({
                      ...editPlayer,
                      nationality: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg uppercase"
                />
              </div>

              {/* Stats Manual Override */}
              <div className="p-3 bg-gray-50 border rounded-xl">
                <p className="font-black text-gray-800 uppercase mb-2">Statistics Override</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-600 text-[10px]">Wins</label>
                    <input
                      type="number"
                      value={editPlayer.wins}
                      onChange={(e) =>
                        setEditPlayer({ ...editPlayer, wins: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-[10px]">Draws</label>
                    <input
                      type="number"
                      value={editPlayer.draws}
                      onChange={(e) =>
                        setEditPlayer({ ...editPlayer, draws: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-[10px]">Losses</label>
                    <input
                      type="number"
                      value={editPlayer.losses}
                      onChange={(e) =>
                        setEditPlayer({ ...editPlayer, losses: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-[10px]">Goals For</label>
                    <input
                      type="number"
                      value={editPlayer.goalsFor}
                      onChange={(e) =>
                        setEditPlayer({ ...editPlayer, goalsFor: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-[10px]">Goals Against</label>
                    <input
                      type="number"
                      value={editPlayer.goalsAgainst}
                      onChange={(e) =>
                        setEditPlayer({ ...editPlayer, goalsAgainst: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-[10px]">Coins</label>
                    <input
                      type="number"
                      value={editPlayer.coins}
                      onChange={(e) =>
                        setEditPlayer({ ...editPlayer, coins: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-2 py-1 border rounded font-bold text-amber-700"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditPlayer(null)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-[#0a1128] text-white font-bold rounded-lg hover:bg-[#1a237e] transition disabled:opacity-50"
                >
                  {formLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST COINS MODAL */}
      {coinPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-black text-base uppercase tracking-tight text-gray-900">
                Adjust Coins: @{coinPlayer.username}
              </h3>
              <button onClick={() => setCoinPlayer(null)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Current balance:{" "}
              <strong className="text-amber-700 font-bold">{coinPlayer.coins} coins</strong>
            </p>

            <form onSubmit={handleAdjustCoins} className="space-y-4 mt-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Adjustment Mode</label>
                <select
                  value={coinMode}
                  onChange={(e) => setCoinMode(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="ADD">Add Coins (+)</option>
                  <option value="SUBTRACT">Deduct Coins (-)</option>
                  <option value="SET">Set Exact Balance (=)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Amount</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={coinReason}
                  onChange={(e) => setCoinReason(e.target.value)}
                  placeholder="e.g. Tournament prize / Penalty"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCoinPlayer(null)}
                  className="px-4 py-2 border rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletePlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border-4 border-red-500">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight text-gray-900">
                  Delete Player @{deletePlayer.username}?
                </h3>
                <p className="text-xs font-bold text-gray-500">
                  {deletePlayer.teamName} &bull; {deletePlayer.coins} coins
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-5">
              <p className="text-xs font-semibold text-red-900 leading-relaxed">
                This will permanently delete the player, their portal login, and all their competition registrations. Bet history will be preserved as audit records.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletePlayer(null)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={formLoading}
                onClick={handleDeletePlayer}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {formLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
