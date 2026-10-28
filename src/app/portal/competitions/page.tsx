"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Countdown } from "@/components/Countdown";
import {
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  XCircle,
  Calendar,
  Search,
  X,
  Shield,
  Plus,
} from "lucide-react";

interface ParticipantInfo {
  id: string;
  playerId: string;
  teamId?: string | null;
  teamName?: string | null;
  teamLogoUrl?: string | null;
  team?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  player?: {
    id: string;
    username: string;
  } | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
}

interface CompetitionItem {
  id: string;
  name: string;
  description?: string | null;
  additionalInfo?: any;
  matchdayEndsAt?: string | null;
  type: string;
  format: string;
  status: string;
  season: string;
  badgeKey?: string | null;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  maxParticipants?: number | null;
  requiresApproval: boolean;
  participants: ParticipantInfo[];
  teams?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  }[];
}

export default function PortalCompetitionsPage() {
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Self-Registration Modal State
  const [registerModalComp, setRegisterModalComp] = useState<CompetitionItem | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedTeamLogoUrl, setSelectedTeamLogoUrl] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [isCustomTeam, setIsCustomTeam] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const loadData = async () => {
    try {
      const [meRes, compRes] = await Promise.all([
        fetch("/api/auth/player/me", { cache: "no-store" }),
        fetch("/api/competitions", { cache: "no-store" }),
      ]);

      const meData = await meRes.json();
      const compData = await compRes.json();

      if (meData.player) {
        setCurrentUserId(meData.player.id);
      }

      // Filter competitions with REGISTRATION_OPEN or REGISTRATION_CLOSED or IN_PROGRESS
      const allComps: CompetitionItem[] = compData.competitions || [];
      const relevant = allComps.filter((c) =>
        ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"].includes(c.status)
      );

      setCompetitions(relevant);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load tournament directory." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRegisterModal = (comp: CompetitionItem) => {
    setRegisterModalComp(comp);
    setSelectedTeamId(null);
    setSelectedTeamName("");
    setSelectedTeamLogoUrl("");
    setTeamSearchQuery("");
    setIsCustomTeam(false);
    setTeamDropdownOpen(false);
    setRegisterError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "team-logos");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedTeamLogoUrl(data.url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerModalComp) return;

    const trimmed = selectedTeamName.trim();
    if (!trimmed) {
      setRegisterError("Please choose or enter a team name.");
      return;
    }

    // Check if team is taken in this competition
    const taken = registerModalComp.participants.find(
      (p) =>
        (p.status === "APPROVED" || p.status === "PENDING") &&
        p.playerId !== currentUserId &&
        ((selectedTeamId && p.teamId === selectedTeamId) ||
          (p.teamName && p.teamName.trim().toLowerCase() === trimmed.toLowerCase()))
    );

    if (taken) {
      setRegisterError(
        `Team "${trimmed}" is already taken by @${
          taken.player?.username || "another competitor"
        }. Please choose another team.`
      );
      return;
    }

    setActionLoadingId(registerModalComp.id);
    setRegisterError(null);

    try {
      const res = await fetch(`/api/portal/competitions/${registerModalComp.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId || undefined,
          teamName: trimmed,
          teamLogoUrl: selectedTeamLogoUrl || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register.");
      }

      setRegisterModalComp(null);
      setMessage({
        type: "success",
        text: data.message || "Successfully enrolled! Your team is now locked for this tournament.",
      });
      await loadData();
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : "Failed to register.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWithdraw = async (compId: string) => {
    if (!confirm("Are you sure you want to withdraw from this competition?")) return;

    setActionLoadingId(compId);
    setMessage(null);

    try {
      const res = await fetch(`/api/portal/competitions/${compId}/withdraw`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to withdraw.");
      }

      setMessage({ type: "success", text: data.message || "Withdrawn successfully." });
      await loadData();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to withdraw.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#00b4ff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-blue-200">Loading tournaments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wide text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#e5b53e]" />
          Tournament Directory & Entry
        </h1>
        <p className="text-xs text-blue-200 mt-1">
          Review open federation tournaments, submit your team entry, or manage participation.
        </p>
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

      {/* Competitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions.length === 0 ? (
          <div className="col-span-full bg-white text-slate-800 border border-slate-200/80 rounded-2xl p-10 text-center shadow-sm">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No tournaments currently open for registration.</p>
            <p className="text-xs text-slate-400 mt-1">
              Competitions announced by Match Admins will show here with real-time countdowns.
            </p>
          </div>
        ) : (
          competitions.map((comp) => {
            const bannerSrc = comp.badgeKey || "/branding/competition-banner.svg";
            const isOpen = comp.status === "REGISTRATION_OPEN";

            const approvedCount = comp.participants.filter(
              (p) => p.status === "APPROVED"
            ).length;
            const max = comp.maxParticipants || 16;
            const spotsLeft = Math.max(0, max - approvedCount);

            // Find my status in this competition
            const myParticipant = currentUserId
              ? comp.participants.find((p) => p.playerId === currentUserId)
              : null;
            const myStatus = myParticipant ? myParticipant.status : null;
            const isRegistered =
              myStatus === "APPROVED" || myStatus === "PENDING";
            const isWithdrawn = myStatus === "WITHDRAWN";

            const isActionLoading = actionLoadingId === comp.id;

            return (
              <div
                key={comp.id}
                className="bg-white text-slate-900 border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  {/* Banner */}
                  <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                    <Image
                      src={bannerSrc}
                      alt={comp.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isOpen
                            ? "bg-[#00c853] text-white shadow-md"
                            : "bg-slate-800 text-slate-200"
                        }`}
                      >
                        {isOpen ? "Registration Open" : comp.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono font-bold text-[#e5b53e] border border-blue-900">
                        Season {comp.season}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3.5">
                    <div>
                      <h3 className="font-black text-lg text-[#0f172a] leading-tight">
                        {comp.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>{comp.type}</span>
                        <span>•</span>
                        <span>{comp.format.replace("_", " ")}</span>
                      </div>
                      {comp.description && (
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                          {comp.description}
                        </p>
                      )}
                    </div>

                    {/* Collapsible More Info */}
                    {comp.additionalInfo && (
                      <details className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-600">
                        <summary className="font-bold text-[#e5b53e] uppercase cursor-pointer select-none">
                          More Info
                        </summary>
                        <p className="mt-1 text-slate-700 leading-normal whitespace-pre-wrap">
                          {typeof comp.additionalInfo === "string"
                            ? comp.additionalInfo
                            : comp.additionalInfo.notes || JSON.stringify(comp.additionalInfo)}
                        </p>
                      </details>
                    )}

                    {/* Matchday Countdown */}
                    {comp.matchdayEndsAt && (
                      <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                          Matchday Countdown:
                        </p>
                        <Countdown targetDate={comp.matchdayEndsAt} />
                      </div>
                    )}

                    {/* Registration Countdown */}
                    {isOpen && comp.registrationCloseAt && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Registration Closes In:
                        </p>
                        <Countdown targetDate={comp.registrationCloseAt} />
                      </div>
                    )}

                    {/* Player's Per-Competition Team */}
                    {myParticipant && (
                      <div className="flex items-center gap-2 p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80">
                        {(myParticipant.teamLogoUrl || myParticipant.team?.logoUrl) && (
                          <img
                            src={myParticipant.teamLogoUrl || myParticipant.team?.logoUrl || ""}
                            alt="Crest"
                            className="w-5 h-5 object-contain shrink-0"
                          />
                        )}
                        <div className="text-xs leading-none">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                            My Team in this Tournament
                          </span>
                          <span className="font-bold text-[#0a1128]">
                            {myParticipant.teamName || myParticipant.team?.name || "Team Pending Assignment"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quota & My Status */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Spots Available
                        </span>
                        <span className="font-mono font-bold text-[#0f172a]">
                          {spotsLeft} of {max} slots
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          My Status
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            myStatus === "APPROVED"
                              ? "bg-[#00c853]/15 text-[#00c853]"
                              : myStatus === "PENDING"
                              ? "bg-blue-50 text-blue-700"
                              : myStatus === "WITHDRAWN"
                              ? "bg-slate-100 text-slate-500"
                              : "text-slate-400"
                          }`}
                        >
                          {myStatus || "Not Enrolled"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between gap-3 mt-4">
                  <Link
                    href={`/competition/${comp.id}`}
                    className="text-xs font-bold text-blue-700 hover:text-[#00b4ff] transition"
                  >
                    View Details →
                  </Link>

                  {/* Register / Withdraw Button */}
                  {isOpen ? (
                    isRegistered ? (
                      <button
                        onClick={() => handleWithdraw(comp.id)}
                        disabled={isActionLoading}
                        className="px-3.5 py-1.5 bg-[#e90052]/10 hover:bg-[#e90052] text-[#e90052] hover:text-white border border-[#e90052]/30 rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                      >
                        {isActionLoading ? "Processing..." : "Withdraw"}
                      </button>
                    ) : (
                      <button
                        onClick={() => openRegisterModal(comp)}
                        disabled={isActionLoading || spotsLeft <= 0}
                        className="px-4 py-2 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm hover:scale-105 disabled:opacity-50"
                      >
                        {isActionLoading
                          ? "Submitting..."
                          : isWithdrawn
                          ? "Re-register"
                          : "Register Now"}
                      </button>
                    )
                  ) : (
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                      Registration Closed
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SELF-REGISTRATION MODAL WITH TEAM DROPDOWN */}
      {registerModalComp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base uppercase tracking-tight text-gray-900">
                  Select Your Team
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {registerModalComp.name} • Season {registerModalComp.season}
                </p>
              </div>
              <button
                onClick={() => setRegisterModalComp(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={submitRegistration} className="space-y-4 mt-4 text-xs font-semibold">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-gray-700 font-bold">
                    Choose Your Tournament Team *
                  </label>
                  {isCustomTeam ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomTeam(false);
                        setSelectedTeamId(null);
                        setSelectedTeamName("");
                        setTeamSearchQuery("");
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-bold"
                    >
                      ← Available Teams
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomTeam(true);
                        setSelectedTeamId(null);
                        setSelectedTeamName("");
                        setTeamSearchQuery("");
                        setTeamDropdownOpen(false);
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-bold"
                    >
                      + Custom team name
                    </button>
                  )}
                </div>

                {isCustomTeam ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      required
                      value={selectedTeamName}
                      onChange={(e) => {
                        setSelectedTeamName(e.target.value);
                        setRegisterError(null);
                      }}
                      placeholder="e.g. Paris Saint-Germain / Arsenal FC"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <div>
                      <label className="block text-gray-500 text-[10px] font-bold uppercase mb-1">
                        Team Crest Logo (Optional)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="text-xs"
                        />
                        {selectedTeamLogoUrl && (
                          <img
                            src={selectedTeamLogoUrl}
                            alt="Logo"
                            className="w-7 h-7 object-contain border rounded"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white">
                      <Search className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={teamSearchQuery}
                        onChange={(e) => {
                          setTeamSearchQuery(e.target.value);
                          setSelectedTeamName(e.target.value);
                          setSelectedTeamId(null);
                          setTeamDropdownOpen(true);
                          setRegisterError(null);
                        }}
                        onFocus={() => setTeamDropdownOpen(true)}
                        placeholder="Search tournament teams..."
                        className="w-full text-xs font-bold focus:outline-none"
                      />
                      {selectedTeamId && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                          Selected
                        </span>
                      )}
                    </div>

                    {teamDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-1 divide-y divide-gray-50">
                        {(() => {
                          const allTeams = registerModalComp.teams || [];
                          const filtered = allTeams.filter((t) =>
                            t.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
                          );

                          if (filtered.length === 0) {
                            return (
                              <div className="p-3 text-center text-gray-400 text-[11px]">
                                No matching available teams. Click "+ Custom team name" above to enter yours.
                              </div>
                            );
                          }

                          return filtered.map((t) => {
                            const taken = registerModalComp.participants.find(
                              (p) =>
                                (p.status === "APPROVED" || p.status === "PENDING") &&
                                p.playerId !== currentUserId &&
                                ((p.teamId && p.teamId === t.id) ||
                                  (p.teamName &&
                                    p.teamName.trim().toLowerCase() === t.name.trim().toLowerCase()))
                            );
                            const isTaken = Boolean(taken);

                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  if (isTaken) {
                                    setRegisterError(
                                      `Team "${t.name}" has already been taken by @${
                                        taken?.player?.username || "another competitor"
                                      }.`
                                    );
                                    return;
                                  }
                                  setSelectedTeamId(t.id);
                                  setSelectedTeamName(t.name);
                                  setTeamSearchQuery(t.name);
                                  if (t.logoUrl) setSelectedTeamLogoUrl(t.logoUrl);
                                  setTeamDropdownOpen(false);
                                  setRegisterError(null);
                                }}
                                className={`flex items-center justify-between p-2.5 rounded-lg transition ${
                                  isTaken
                                    ? "bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
                                    : "hover:bg-blue-50 text-gray-800 cursor-pointer"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  {t.logoUrl ? (
                                    <img
                                      src={t.logoUrl}
                                      alt={t.name}
                                      className="w-5 h-5 object-contain"
                                    />
                                  ) : (
                                    <Shield className="w-4 h-4 text-gray-400" />
                                  )}
                                  <span className="font-bold">{t.name}</span>
                                </div>
                                {isTaken ? (
                                  <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                    Taken
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Available
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-gray-400 mt-1.5">
                  ⚠️ Note: Once registered, your team identity is locked for the duration of this competition.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRegisterModalComp(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoadingId) || uploadingLogo || !selectedTeamName.trim()}
                  className="px-5 py-2.5 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black uppercase tracking-wider rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {actionLoadingId ? "Enrolling..." : "Confirm & Enroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
