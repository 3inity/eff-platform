"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/player/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setSuccess("Password updated successfully! Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/portal");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
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
            Set Permanent Password
          </h1>
          <p className="text-xs font-semibold text-[#00b4ff] tracking-widest uppercase mt-1">
            Federation Security Requirement
          </p>
        </div>

        {/* Change Password Form */}
        <div className="p-8">
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            For federation security, you must update your temporary password before accessing tournaments or personal settings. Passwords must be at least 8 characters.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-[#e90052] text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-[#e90052] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-[#00c853] text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#00c853] mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Current / Temporary Password
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b4ff] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                New Password (Min 8 Characters)
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b4ff] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b4ff] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full mt-2 py-3.5 px-4 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-[#00b4ff]/25 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                "Saving New Password..."
              ) : (
                <>
                  Update Password & Enter <ArrowRight className="w-4 h-4 text-[#0a1128]" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
