"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Users,
  Trophy,
  Swords,
  Coins,
  ShieldAlert,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

interface AdminUser {
  id: string;
  role: "SUPER_ADMIN" | "MATCH_ADMIN" | "BET_ADMIN" | "PLAYER_ADMIN";
  username: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // 1. ALL HOOKS CALLED UNCONDITIONALLY AT THE VERY TOP
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Skip fetching admin session if we are already on the login page
    if (pathname === "/admin/login") {
      return;
    }

    let isMounted = true;
    fetch("/api/auth/admin/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (isMounted) setAdmin(data.admin);
      })
      .catch(() => {
        if (isMounted) router.push("/admin/login");
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const navItems = [
    { label: "Competitions", href: "/admin/competitions", icon: Trophy },
    { label: "Matches", href: "/admin/matches", icon: Swords },
    { label: "Players", href: "/admin/players", icon: Users },
    { label: "Bets & Cashouts", href: "/admin/bets", icon: Coins },
    {
      label: "Admins",
      href: "/admin/admins",
      icon: ShieldAlert,
      superOnly: true,
    },
    {
      label: "Audit Log",
      href: "/admin/audit",
      icon: ClipboardList,
    },
  ];

  // 2. CONDITIONAL RETURNS ONLY AFTER ALL HOOKS HAVE BEEN CALLED
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0a1128] text-white">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0a1128] border-b border-blue-900/50 text-white">
        <div className="flex items-center gap-3">
          <Image src="/branding/eff-logo.svg" alt="EFF" width={32} height={32} className="w-8 h-8 object-contain" />
          <span className="font-black text-sm uppercase tracking-wider">EFF Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-blue-200 hover:text-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-64 bg-gradient-to-b from-[#0a1128] via-[#0d163a] to-[#101c4e] border-r border-blue-900/40 shrink-0 z-40`}
      >
        {/* EFF Crest & Branding */}
        <div className="p-6 border-b border-blue-900/50 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-black/40 border border-[#e5b53e] p-1 flex items-center justify-center shrink-0 shadow-md">
            <Image src="/branding/eff-logo.svg" alt="EFF Crest" width={40} height={40} className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h2 className="font-black text-base uppercase tracking-tight text-white leading-tight">
              EFF Admin
            </h2>
            <span className="text-[10px] font-bold text-[#e5b53e] uppercase tracking-wider">
              Control Centre
            </span>
          </div>
        </div>

        {/* Current Admin Badge */}
        {admin && (
          <div className="px-6 py-4 border-b border-blue-900/40 bg-[#101c4e]/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-300">Signed in as</p>
                <p className="text-sm font-bold text-white capitalize">{admin.username}</p>
              </div>
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  admin.role === "SUPER_ADMIN"
                    ? "bg-[#e5b53e]/20 text-[#ffe270] border border-[#e5b53e]/50"
                    : "bg-[#00b4ff]/20 text-[#00b4ff] border border-[#00b4ff]/40"
                }`}
              >
                {admin.role.replace("_", " ")}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            if (item.superOnly && admin?.role !== "SUPER_ADMIN") {
              return null;
            }
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                  isActive
                    ? "bg-[#00b4ff] text-[#0a1128] font-black shadow-md shadow-[#00b4ff]/20"
                    : "text-blue-200 hover:bg-blue-900/40 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0a1128]" : "text-blue-300"}`} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-blue-900/40 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-blue-200 hover:text-white hover:bg-blue-900/40 transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
              Public Site
            </span>
            <span className="text-[10px] text-blue-400">Live ↗</span>
          </a>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#e90052] hover:bg-[#e90052]/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-8 bg-gradient-to-br from-[#0a1128] via-[#0d163a] to-[#101c4e]">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
