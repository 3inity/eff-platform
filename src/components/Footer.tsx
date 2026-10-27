import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Shield, BookOpen, User, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-blue-900/60 bg-[#070b1a] text-blue-200 text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffe066] to-[#e5b53e] p-0.5">
                <div className="w-full h-full rounded-full bg-[#0a1128] flex items-center justify-center overflow-hidden">
                  <Image
                    src="/branding/eff-logo.svg"
                    alt="EFF Logo"
                    width={32}
                    height={32}
                    className="w-7 h-7 object-contain"
                  />
                </div>
              </div>
              <div>
                <h3 className="font-black text-white text-base tracking-wider">
                  EINITY FOOTBALL FEDERATION
                </h3>
                <p className="text-xs text-[#00b4ff]">The Premier eSports Football Ecosystem</p>
              </div>
            </div>
            <p className="text-xs text-blue-200/80 leading-relaxed max-w-md">
              EFF governs premier competitive eFootball tournaments, real-time statistical records,
              verifiable player rankings, and an internal non-fiat coin economy designed for sportsmanship and peak competition.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-3 text-[#e5b53e]">
              Federation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#competitions" className="hover:text-white transition flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#e5b53e]" />
                  Active Tournaments
                </Link>
              </li>
              <li>
                <Link href="/rules" className="hover:text-white transition flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#00b4ff]" />
                  Official Code of Rules
                </Link>
              </li>
              <li>
                <Link href="/portal/login" className="hover:text-white transition flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-300" />
                  Player Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-300" />
                  Staff Administration
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Policy */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-3 text-[#e5b53e]">
              Integrity & Fair Play
            </h4>
            <p className="text-xs text-blue-200/70 leading-relaxed mb-3">
              All match results and accumulator bets are immutably audited. EFF Coins operate strictly within the federation ecosystem and are not cash deposits.
            </p>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00c853] bg-[#00c853]/10 border border-[#00c853]/30 px-2.5 py-1 rounded">
              <Shield className="w-3.5 h-3.5" />
              Verified Federation System
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-blue-900/40 flex flex-col sm:flex-row items-center justify-between text-xs text-blue-300/80 gap-3">
          <p>© {new Date().getFullYear()} Einity Football Federation (EFF). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[11px]">Midnight Blue Identity</span>
            <span className="text-blue-600">•</span>
            <span className="text-[11px]">App Router v15</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
