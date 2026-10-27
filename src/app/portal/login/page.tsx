"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Lock, AlertCircle, ArrowRight } from "lucide-react";

export default function PlayerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/player/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      if (data.mustChangePassword) {
        router.push("/portal/change-password");
      } else {
        router.push("/portal");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a1128] via-[#101c4e] to-[#1a237e]">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-blue-900/30">
        {/* Navy Header */}
        <div className="bg-gradient-to-r from-[#0a1128] to-[#101c4e] p-8 text-center text-white relative">
          <div className="w-20 h-20 mx-auto mb-4 relative flex items-center justify-center bg-black/40 rounded-full border-2 border-[#e5b53e] p-2 shadow-lg">
            <Image
              src="/branding/eff-logo.svg"
              alt="EFF Logo"
              width={64}
              height={64}
              className="w-16 h-16 object-contain drop-shadow"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            Player Portal Login
          </h1>
          <p className="text-xs font-semibold text-[#00b4ff] tracking-widest uppercase mt-1">
            Einity Football Federation
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-[#e90052] text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-[#e90052] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Player Username
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. mbappe7"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b4ff] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b4ff] focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-[#00b4ff]/25 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  Sign In to Portal <ArrowRight className="w-4 h-4 text-[#0a1128]" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <Link href="/" className="hover:text-[#00b4ff] transition">
              ← Back to Federation Site
            </Link>
            <Link href="/rules" className="hover:text-[#00b4ff] transition">
              Official Rules
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
