"use client";

import React, { useEffect, useState } from "react";
import { Swords, Plus, CheckCircle, AlertCircle, Calendar } from "lucide-react";

interface Competition {
  id: string;
  name: string;
  season: string;
}

interface Player {
  id: string;
  username: string;
  teamName: string;
  avatarUrl: string | null;
}

interface Match {
  id: string;
  homeScore: number;
  awayScore: number;
  playedAt: string;
  competition: { name: string; season: string };
  homePlayer: Player;
  awayPlayer: Player;
  admin?: { player?: { username: string } };
}

export default function AdminMatchesPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [competitionId, setCompetitionId] = useState("");
  const [homePlayerId, setHomePlayerId] = useState("");
  const [awayPlayerId, setAwayPlayerId] = useState("");
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 16));

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [compRes, playersRes, matchRes] = await Promise.all([
        fetch("/api/admin/competitions"),
        fetch("/api/admin/players"),
        fetch("/api/matches/recent?limit=30"),
      ]);

      const [compData, playersData, matchData] = await Promise.all([
        compRes.json(),
        playersRes.json(),
        matchRes.json(),
      ]);

      setCompetitions(compData.competitions || []);
      setPlayers(playersData.players || []);
      setMatches(matchData.matches || []);

      if (compData.competitions?.length > 0 && !competitionId) {
        setCompetitionId(compData.competitions[0].id);
      }
    } catch (err) {
      console.error("Failed to load match form data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (homePlayerId === awayPlayerId) {
      setErrorMsg("Home and away players must be different.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId,
          homePlayerId,
          awayPlayerId,
          homeScore: parseInt(homeScore, 10),
          awayScore: parseInt(awayScore, 10),
          playedAt: new Date(playedAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to enter match result.");

      setSuccessMsg("Match result successfully recorded! Player stats automatically updated.");
      setHomeScore("0");
      setAwayScore("0");
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving match.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Match Operations & Scoring
        </h1>
        <p className="text-xs text-gray-400 font-semibold mt-0.5">
          Enter match scorecards to automatically synchronize league standings and player form.
        </p>
      </div>

      {/* Enter Match Score Form (Card) */}
      <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden border border-blue-900/20">
        <div className="bg-gradient-to-r from-[#0a1128] to-[#101c4e] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#00ff85]" />
            <h2 className="font-black text-sm uppercase tracking-wider">
              Enter Official Result
            </h2>
          </div>
          <span className="text-[10px] font-black text-[#00ff85] bg-[#00ff85]/10 px-2 py-0.5 rounded border border-[#00ff85]/30 uppercase tracking-widest">
            Auto-Syncs Player Stats
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Competition Selector & Played At */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Competition *
              </label>
              <select
                required
                value={competitionId}
                onChange={(e) => setCompetitionId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#0a1128]"
              >
                {competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.season})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Match Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#0a1128]"
              />
            </div>
          </div>

          {/* Versus Matchup Visual Grid */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            {/* Home Player (col 1-5) */}
            <div className="md:col-span-5 space-y-3">
              <label className="block text-xs font-black uppercase text-blue-950 tracking-wider">
                🏠 Home Player
              </label>
              <select
                required
                value={homePlayerId}
                onChange={(e) => setHomePlayerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-bold"
              >
                <option value="">-- Select Home Player --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    @{p.username} ({p.teamName})
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Home Goals
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl text-center text-2xl font-black text-[#0a1128]"
                />
              </div>
            </div>

            {/* VS Divider (col 6) */}
            <div className="md:col-span-1 text-center font-black text-gray-400 text-sm">
              VS
            </div>

            {/* Away Player (col 7-11) */}
            <div className="md:col-span-5 space-y-3">
              <label className="block text-xs font-black uppercase text-blue-950 tracking-wider">
                ✈️ Away Player
              </label>
              <select
                required
                value={awayPlayerId}
                onChange={(e) => setAwayPlayerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-bold"
              >
                <option value="">-- Select Away Player --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    @{p.username} ({p.teamName})
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Away Goals
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl text-center text-2xl font-black text-[#0a1128]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-gradient-to-r from-[#e90052] to-[#ff2882] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-pink-500/20 active:scale-[0.99] transition disabled:opacity-50"
            >
              {submitting ? "Recording Score..." : "Commit Match Score"}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Matches Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-tight text-white">
          Recorded Results
        </h2>

        <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a1128] text-white uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Competition</th>
                <th className="py-3 px-4">Home Side</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-right">Away Side</th>
                <th className="py-3 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-semibold">
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    No matches recorded yet.
                  </td>
                </tr>
              ) : (
                matches.map((m) => (
                  <tr key={m.id} className="hover:bg-blue-50/50">
                    <td className="py-3 px-4 font-bold text-blue-900">
                      {m.competition?.name}
                    </td>
                    <td className="py-3 px-4 font-black text-gray-900">
                      @{m.homePlayer?.username}{" "}
                      <span className="text-gray-500 font-normal text-[11px]">
                        ({m.homePlayer?.teamName})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-3 py-1 bg-gray-900 text-white font-black text-sm rounded-lg shadow-sm">
                        {m.homeScore} - {m.awayScore}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">
                      <span className="text-gray-500 font-normal text-[11px]">
                        ({m.awayPlayer?.teamName})
                      </span>{" "}
                      @{m.awayPlayer?.username}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 text-[11px]">
                      {new Date(m.playedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
