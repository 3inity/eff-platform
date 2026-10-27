"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  User,
  Trophy,
  Coins,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { CountryFlag } from "@/components/CountryFlag";

interface PlayerSession {
  id: string;
  username: string;
  teamName: string;
  clubName?: string | null;
  clubLogoUrl?: string | null;
  avatarUrl?: string | null;
  coins: number;
  nationality?: string | null;
  mustChangePassword?: boolean;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // 1. ALL HOOKS CALLED UNCONDITIONALLY AT THE ROOT
  const pathname = usePathname();
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Skip fetching session if already on login or change-password
    if (pathname === "/portal/login" || pathname === "/portal/change-password") {
      return;
    }

    let isMounted = true;
    fetch("/api/auth/player/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (data.player?.mustChangePassword && pathname !== "/portal/change-password") {
            router.push("/portal/change-password");
            return;
          }
          setPlayer(data.player);
        }
      })
      .catch(() => {
        if (isMounted) router.push("/portal/login");
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/player/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  };

  // 2. CONDITIONAL RETURN FOR AUTH PAGES
  if (pathname === "/portal/login" || pathname === "/portal/change-password") {
    return <>{children}</>;
  }

  const navLinks = [
    { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
    { label: "Profile", href: "/portal/profile", icon: User },
    { label: "Competitions", href: "/portal/competitions", icon: Trophy },
    { label: "Bets & Wallet", href: "/portal/bets", icon: Coins },
  ];

  const avatarSrc = player?.avatarUrl || "/branding/eff-logo.svg";
  const crestSrc = player?.clubLogoUrl || "/branding/default-crest.svg";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1128] via-[#101c4e] to-[#1a237e] text-white">
      {/* Portal Top Nav */}
      <header className="sticky top-0 z-50 bg-[#0a1128]/95 backdrop-blur-md border-b border-blue-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand */}
            <div className="flex items-center gap-6">
              <Link href="/portal" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffe066] to-[#e5b53e] p-0.5 shadow-md">
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
                <div className="flex flex-col">
                  <span className="font-black text-sm tracking-wider uppercase text-white">
                    EFF Player Portal
                  </span>
                  <span className="text-[10px] tracking-widest text-[#00b4ff] font-bold uppercase -mt-0.5">
                    Official Competitor Hub
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1.5 ml-4">
                {navLinks.map((item) => {
                  const isActive =
                    item.href === "/portal"
                      ? pathname === "/portal"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                        isActive
                          ? "bg-[#00b4ff] text-[#0a1128] font-black shadow-md shadow-[#00b4ff]/20"
                          : "text-blue-200 hover:text-white hover:bg-blue-900/40"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Player Avatar + Club Crest + Coins + Logout */}
            <div className="hidden md:flex items-center gap-4">
              {player && (
                <div className="flex items-center gap-3 bg-[#101c4e] border border-blue-800/60 rounded-xl px-3 py-1.5 shadow-inner">
                  {/* Crest & Avatar combo */}
                  <div className="relative flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#e5b53e] p-0.5 flex items-center justify-center overflow-hidden shadow-xs">
                      <Image
                        src={crestSrc}
                        alt="Club Crest"
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-900 border border-blue-700 overflow-hidden">
                      <Image
                        src={avatarSrc}
                        alt={player.username}
                        width={28}
                        height={28}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white leading-tight">
                        {player.teamName}
                      </span>
                      <CountryFlag countryCode={player.nationality} size={14} />
                    </div>
                    <span className="text-[10px] text-blue-300 font-mono">
                      @{player.username}
                    </span>
                  </div>

                  <div className="h-6 w-px bg-blue-800/60 mx-1" />

                  {/* Coin Badge */}
                  <Link
                    href="/portal/bets"
                    className="flex items-center gap-1 text-xs font-black text-[#e5b53e] font-mono hover:scale-105 transition"
                  >
                    <Coins className="w-4 h-4 text-[#e5b53e]" />
                    <span>{player.coins.toLocaleString()}</span>
                  </Link>
                </div>
              )}

              <Link
                href="/"
                target="_blank"
                className="text-xs font-bold text-blue-300 hover:text-white transition flex items-center gap-1"
                title="View Public Site"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#e90052] hover:bg-[#e90052]/10 border border-[#e90052]/30 px-3 py-1.5 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile Hamburger */}
            <div className="flex md:hidden items-center gap-2">
              {player && (
                <div className="flex items-center gap-1 text-xs font-mono font-black text-[#e5b53e] bg-[#101c4e] px-2.5 py-1 rounded-lg border border-blue-800">
                  <Coins className="w-3.5 h-3.5 text-[#e5b53e]" />
                  <span>{player.coins}</span>
                </div>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-[#101c4e] text-blue-200 hover:text-white border border-blue-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-blue-900/50 bg-[#0a1128] px-4 py-4 space-y-3">
            {player && (
              <div className="flex items-center gap-3 p-3 bg-[#101c4e] rounded-xl border border-blue-800">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-blue-700 overflow-hidden">
                  <Image
                    src={avatarSrc}
                    alt={player.username}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">
                      {player.teamName}
                    </span>
                    <CountryFlag countryCode={player.nationality} size={14} />
                  </div>
                  <p className="text-[10px] text-blue-300 font-mono">@{player.username}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {navLinks.map((item) => {
                const isActive =
                  item.href === "/portal"
                    ? pathname === "/portal"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-[#00b4ff] text-[#0a1128] font-black"
                        : "text-blue-200 hover:bg-blue-900/40 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-blue-900/50 flex items-center justify-between">
              <Link
                href="/"
                target="_blank"
                className="text-xs text-blue-300 hover:text-white flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Public Site
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-[#e90052] flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Portal View */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
