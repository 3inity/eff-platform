"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { CountryFlag } from "@/components/CountryFlag";
import {
  User,
  Shield,
  Coins,
  Calendar,
  AtSign,
  Trophy,
} from "lucide-react";

interface PlayerProfile {
  id: string;
  username: string;
  xHandle: string;
  teamName: string;
  avatarUrl?: string | null;
  nationality?: string | null;
  coins: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  createdAt: string;
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/player/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.player) {
          setProfile(data.player);
        } else {
          setError("Failed to load player identity.");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Error connecting to server.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#00b4ff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-blue-200">Loading your profile record...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 bg-red-900/20 border border-red-500/40 rounded-2xl text-center text-red-200 text-sm">
        {error || "Profile could not be retrieved."}
      </div>
    );
  }

  const avatarSrc = profile.avatarUrl || "/branding/eff-logo.svg";
  const totalMatches = profile.wins + profile.draws + profile.losses;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wide text-white flex items-center gap-2">
          <User className="w-6 h-6 text-[#e5b53e]" />
          My Competitor Profile
        </h1>
        <p className="text-xs text-blue-200 mt-1">
          Official EFF Federation Player Identity (Read-only record). Club assignments are managed per competition.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white text-slate-900 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
          <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-[#e5b53e] p-1 flex items-center justify-center overflow-hidden shadow-md shrink-0">
            <Image
              src={avatarSrc}
              alt={profile.username}
              width={88}
              height={88}
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-[#0f172a]">
                @{profile.username}
              </h2>
              <CountryFlag countryCode={profile.nationality} size={22} />
            </div>
            <p className="text-xs text-blue-700 font-mono font-bold">
              {profile.xHandle}
            </p>
            <p className="text-xs text-slate-500 font-semibold">
              Default Gamertag / Club: <strong className="text-slate-800">{profile.teamName}</strong>
            </p>
          </div>
        </div>

        {/* Identity Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Federation Purse
            </span>
            <span className="font-mono font-black text-lg text-[#e5b53e] flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-[#e5b53e]" />
              {profile.coins.toLocaleString()} EFF
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Overall Federation Record
            </span>
            <span className="font-mono font-black text-lg text-[#0f172a]">
              <span className="text-[#00c853]">{profile.wins}W</span> -{" "}
              <span className="text-slate-500">{profile.draws}D</span> -{" "}
              <span className="text-[#e90052]">{profile.losses}L</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium">{totalMatches} career matches</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Nationality
            </span>
            <span className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
              <CountryFlag countryCode={profile.nationality} size={16} />
              {profile.nationality || "Not specified"}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Registered Since
            </span>
            <span className="font-mono font-bold text-sm text-slate-800">
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Note about Per-Competition Teams */}
        <div className="p-4 bg-blue-50/60 border border-blue-200/60 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
          <Shield className="w-5 h-5 text-[#00b4ff] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Per-Competition Team Identity:</strong> Club names and logos are assigned per tournament.
            When you join or are seeded into a tournament, your team name and crest for that specific competition are displayed on the tournament table and in your <strong className="text-blue-950">My Teams</strong> dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
