"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Lock, User, AlertCircle, ArrowRight } from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, passcode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push(from);
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
          <div className="w-24 h-24 mx-auto mb-4 relative flex items-center justify-center bg-black/40 rounded-full border-2 border-[#e5b53e] p-2 shadow-lg">
            <Image
              src="/branding/eff-logo.svg"
              alt="EFF Logo"
              width={80}
              height={80}
              className="w-20 h-20 object-contain drop-shadow"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            EFF Admin Portal
          </h1>
          <p className="text-xs font-semibold text-[#e5b53e] tracking-widest uppercase mt-1">
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
                Admin Username
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b4ff] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Admin Passcode / Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
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
                  Access Admin Panel <ArrowRight className="w-4 h-4 text-[#0a1128]" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <a
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-[#00b4ff] transition inline-flex items-center gap-1.5"
            >
              ← Back to EFF Public Site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a1128] text-white">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-[#00b4ff] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-blue-200">Loading admin security verification...</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
