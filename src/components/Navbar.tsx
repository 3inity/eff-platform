"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, BookOpen, User, Lock, Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#0a1128]/95 backdrop-blur-md border-b border-blue-900/50 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffe066] via-[#e5b53e] to-[#997010] p-0.5 shadow-lg shadow-black/40 transition group-hover:scale-105">
              <div className="w-full h-full rounded-full bg-[#0a1128] flex items-center justify-center overflow-hidden">
                <Image
                  src="/branding/eff-logo.svg"
                  alt="EFF Logo"
                  width={34}
                  height={34}
                  className="w-8 h-8 object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-[#e5b53e]">
                EINITY FOOTBALL FEDERATION
              </span>
              <span className="text-[10px] tracking-widest text-[#00b4ff] font-semibold uppercase -mt-1">
                Official eSports Federation
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/#competitions"
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-200 hover:text-[#00b4ff] transition py-1"
            >
              <Trophy className="w-4 h-4 text-[#e5b53e]" />
              Competitions
            </Link>

            <Link
              href="/rules"
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-200 hover:text-[#00b4ff] transition py-1"
            >
              <BookOpen className="w-4 h-4 text-[#00b4ff]" />
              Official Rules
            </Link>

            <div className="h-5 w-px bg-blue-800/60" />

            {/* CTA Buttons */}
            <Link
              href="/portal/login"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] px-4 py-2 rounded-lg shadow-md shadow-[#00b4ff]/20 transition hover:scale-[1.02]"
            >
              <User className="w-3.5 h-3.5 text-[#0a1128]" />
              Player Portal
            </Link>

            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#101c4e]/80 hover:bg-[#1a237e] border border-blue-700/50 text-blue-200 hover:text-white px-3.5 py-2 rounded-lg transition"
            >
              <Lock className="w-3.5 h-3.5 text-blue-300" />
              Admin
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#101c4e] text-blue-200 hover:text-white border border-blue-700/40"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-blue-900/40 bg-[#0a1128] px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/#competitions"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-200 hover:bg-[#101c4e] hover:text-[#00b4ff] font-semibold text-sm"
          >
            <Trophy className="w-4 h-4 text-[#e5b53e]" />
            Competitions
          </Link>
          <Link
            href="/rules"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-200 hover:bg-[#101c4e] hover:text-[#00b4ff] font-semibold text-sm"
          >
            <BookOpen className="w-4 h-4 text-[#00b4ff]" />
            Official Rules
          </Link>
          <div className="pt-2 border-t border-blue-900/60 flex flex-col gap-2">
            <Link
              href="/portal/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#00b4ff] text-[#0a1128] py-2.5 rounded-lg"
            >
              <User className="w-4 h-4" />
              Player Portal
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#101c4e] border border-blue-700/60 text-blue-200 py-2.5 rounded-lg"
            >
              <Lock className="w-4 h-4" />
              Admin Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
