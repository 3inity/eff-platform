"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  BookOpen,
  Shield,
  Trophy,
  Coins,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  Scale,
  Users,
  Gamepad2,
  Lock,
  ArrowRight,
} from "lucide-react";

interface RuleSection {
  id: number;
  title: string;
  icon: React.ElementType;
  summary: string;
  badge: string;
  clauses: {
    number: string;
    heading: string;
    body: string;
  }[];
}

const EFF_RULES: RuleSection[] = [
  {
    id: 1,
    title: "Rule 1: Federation Membership & Player Credentials",
    icon: Users,
    badge: "Membership",
    summary:
      "Guidelines regarding competitor registration, single account enforcement, temporary credentials, and mandatory X handle verification.",
    clauses: [
      {
        number: "1.1",
        heading: "Single Account Mandate",
        body: "Every competitor in the Einity Football Federation must maintain exactly one official player account. Creating alternate, secondary, or smurf accounts will result in an immediate federation ban and forfeiture of all accumulated coins.",
      },
      {
        number: "1.2",
        heading: "Temporary Passwords & Onboarding",
        body: "When registered by an authorized Player Admin or Super Admin, players receive a secure temporary password. Players are required by system middleware to change this password immediately upon their first login before accessing tournament registrations or profile tools.",
      },
      {
        number: "1.3",
        heading: "Identity & Social Handle Verification",
        body: "All players must provide a valid, active X (formerly Twitter) handle. Official match announcements, tournament invitations, and federation awards will tag this verified handle.",
      },
      {
        number: "1.4",
        heading: "Club Name & Crest Guidelines",
        body: "Club names and crests must comply with decency standards. Explicit, offensive, or infringing imagery uploaded to the federation asset storage will be summarily replaced with the default federation crest.",
      },
    ],
  },
  {
    id: 2,
    title: "Rule 2: Competitions, Formats & Registration Windows",
    icon: Trophy,
    badge: "Competitions",
    summary:
      "Tournament classifications, Round Robin and Knockout structures, strict countdown deadlines, and participant capping.",
    clauses: [
      {
        number: "2.1",
        heading: "Sanctioned Formats",
        body: "EFF officially sanctions three tournament structures: League (Round Robin with balanced home and away fixtures), Cup (Single or Double Elimination Knockouts), and Custom Group Stages with Championship brackets.",
      },
      {
        number: "2.2",
        heading: "Strict Registration Deadlines",
        body: "Each tournament features a published registration deadline governed by an immutable server-side countdown. Once the countdown expires, the registration portal locks automatically. No late registrations can be granted.",
      },
      {
        number: "2.3",
        heading: "Participant Approval Workflow",
        body: "Player registrations enter a pending queue and must be verified and approved by an authorized Match Admin or Super Admin prior to tournament kickoff.",
      },
      {
        number: "2.4",
        heading: "Minimum Competitor Quorum",
        body: "A competition requires a minimum number of approved participants (typically 4 for cups, 8 for leagues) before the admin can initiate fixtures. If the quorum is not reached, the registration window may be extended or rescheduled.",
      },
    ],
  },
  {
    id: 3,
    title: "Rule 3: Match Scheduling & Evidence Reporting",
    icon: Gamepad2,
    badge: "Matches",
    summary:
      "48-hour match windows, mandatory high-res screenshot evidence, match admin validation, and dispute protocols.",
    clauses: [
      {
        number: "3.1",
        heading: "48-Hour Fixture Windows",
        body: "Once fixtures are drawn, competitors have a designated 48-hour window to coordinate, play, and report their match. Failure to coordinate within the window without prior admin clearance may result in double default.",
      },
      {
        number: "3.2",
        heading: "Mandatory Screenshot Evidence",
        body: "Both players must take a clear, uncropped screenshot of the final match results screen showing final score, gamertags, and game stats. Evidence is uploaded directly to the federation's secure bucket (eff-assets).",
      },
      {
        number: "3.3",
        heading: "Match Admin Result Entry",
        body: "Match results are entered into the central database by certified Match Admins or Super Admins. Upon entry, the system instantly recalculates player wins, draws, losses, goals for, goals against, and tournament standings.",
      },
      {
        number: "3.4",
        heading: "Dispute Window",
        body: "Competitors have exactly 24 hours from the time a match is logged to submit a formal dispute with evidence. Following 24 hours, scorelines are locked permanently.",
      },
    ],
  },
  {
    id: 4,
    title: "Rule 4: Coin Economy & Prize Distribution",
    icon: Coins,
    badge: "Economy",
    summary:
      "Earning mechanics, match victory bonuses, championship purses, and non-fiat ecosystem protections.",
    clauses: [
      {
        number: "4.1",
        heading: "Federation Coin Nature",
        body: "EFF Coins are closed-ecosystem digital federation points designed solely for competitive ranking, tournament entry, and federated prediction protocols. They are not cash deposits.",
      },
      {
        number: "4.2",
        heading: "Match Victory Incentives",
        body: "Competitors earn match victory coin bonuses upon official confirmation of match results by Match Admins. Draw results split the match bonus equally.",
      },
      {
        number: "4.3",
        heading: "Tournament Championship Purses",
        body: "At the conclusion of an official league or cup season, the top finishers are awarded federation prize pools according to the published payout matrix for that season.",
      },
      {
        number: "4.4",
        heading: "Administrative Coin Adjustments",
        body: "Any manual adjustment of a player's coin balance requires Super Admin authorization and is permanently logged in the public audit trail with before-and-after values.",
      },
    ],
  },
  {
    id: 5,
    title: "Rule 5: Official Federation Betting Regulations",
    icon: Scale,
    badge: "Betting",
    summary:
      "Mandatory 4-selection accumulators (accas), 300 to 500 coin stake restrictions, automated payout engine, and void leg rules.",
    clauses: [
      {
        number: "5.1",
        heading: "Accumulator (Acca) Requirement",
        body: "To promote analytical skill, all prediction slips placed through the Player Portal must contain a minimum of 4 distinct match selections (e.g., Home Win, Draw, Away Win). Slips with fewer than 4 picks are strictly rejected by the server.",
      },
      {
        number: "5.2",
        heading: "Permitted Stake Range",
        body: "Every placed slip must have a stake strictly between 300 and 500 EFF coins. Stakes outside this range will be rejected by validation middleware.",
      },
      {
        number: "5.3",
        heading: "Total Odds & Multiplier Formula",
        body: "Total odds are calculated as the geometric product of all individual match selection odds. Potential payout = Stake × Total Odds. Fractions are rounded down to the nearest whole coin.",
      },
      {
        number: "5.4",
        heading: "Automated Settlement & Voided Matches",
        body: "A slip is won only if all 4+ selections are correct. If any selection loses, the slip is marked LOST. If a scheduled match is cancelled or forfeited without replay, that leg's odds revert to 1.00x.",
      },
    ],
  },
  {
    id: 6,
    title: "Rule 6: Coin Withdrawals & Audit Verification",
    icon: Shield,
    badge: "Withdrawals",
    summary:
      "Minimum withdrawal thresholds, admin review queues, escrow coin burning, and anti-fraud protocols.",
    clauses: [
      {
        number: "6.1",
        heading: "Withdrawal Eligibility Threshold",
        body: "Players must hold a minimum verifiable balance (minimum 1,000 EFF coins) to request an official withdrawal. Requests below the minimum cannot be submitted.",
      },
      {
        number: "6.2",
        heading: "Immediate Escrow Deduction",
        body: "Upon submitting a withdrawal request, the requested coins are immediately deducted from the player's active balance and held in escrow to prevent double-spending.",
      },
      {
        number: "6.3",
        heading: "Administrative Approval Queue",
        body: "Authorized Bet Admins or Super Admins review every withdrawal request. Once approved, the transaction is marked as completed and recorded in the audit log.",
      },
      {
        number: "6.4",
        heading: "Rejection & Restoration",
        body: "If a withdrawal request is rejected for irregular play or non-compliance, the escrowed coins are returned to the player's balance with an administrative explanation in the audit log.",
      },
    ],
  },
  {
    id: 7,
    title: "Rule 7: Fair Play, Lag & Disconnections",
    icon: AlertTriangle,
    badge: "Fair Play",
    summary:
      "Mutual disconnection policies, rage-quitting 3-0 forfeiture, unapproved exploits, and toxic conduct penalties.",
    clauses: [
      {
        number: "7.1",
        heading: "Early Disconnections (Before Min 15)",
        body: "If a match disconnects before the 15th in-game minute with the score tied 0-0, the match must be restarted immediately with a clean connection. Both players must consent.",
      },
      {
        number: "7.2",
        heading: "Late Disconnections & Score Preservation",
        body: "If a disconnection occurs after the 15th in-game minute, the players must restart a new game and play only the remaining minutes, adding the goals scored in the restarted portion to the previous scoreline.",
      },
      {
        number: "7.3",
        heading: "Rage-Quitting & Unilateral Quits",
        body: "Intentionally leaving a match, powering off consoles, or pulling Ethernet cables results in an immediate 3-0 default defeat (or the scoreline at the time of quitting if higher) plus a 100-coin disciplinary fine.",
      },
      {
        number: "7.4",
        heading: "Exploits & Unsporting Conduct",
        body: "Exploiting known glitches, intentional time-wasting in personal halves without challenge, or abusive communications will result in tournament disqualification.",
      },
    ],
  },
  {
    id: 8,
    title: "Rule 8: Administrative Governance & Audit Immutability",
    icon: Lock,
    badge: "Governance",
    summary:
      "Hierarchy of Super Admin, Match Admin, Bet Admin, and Player Admin roles, plus the immutable rollback audit log.",
    clauses: [
      {
        number: "8.1",
        heading: "Administrative Hierarchy",
        body: "EFF operations are governed by four specialized staff roles: Super Admin (Executive authority & staff management), Match Admin (Fixtures & scorelines), Bet Admin (Slips & withdrawals), and Player Admin (Registration & credentials).",
      },
      {
        number: "8.2",
        heading: "Super Admin Prerogative",
        body: "The Super Admin maintains sovereign bypass authority across all system endpoints and serves as the final, unappealable court of arbitration for any federation dispute.",
      },
      {
        number: "8.3",
        heading: "Immutable Audit Trail",
        body: "Every action taken by any administrator—including player edits, score overrides, coin adjustments, and role appointments—is written to an immutable AuditLog table with complete before-and-after JSON snapshots.",
      },
      {
        number: "8.4",
        heading: "Reversion Capability",
        body: "The Super Admin can inspect the audit trail and execute a one-click rollback on reversible administrative actions, restoring the exact historical database state.",
      },
    ],
  },
];

export default function RulesPage() {
  const [search, setSearch] = useState("");
  const [openSectionId, setOpenSectionId] = useState<number | null>(1);

  const filteredRules = EFF_RULES.filter(
    (rule) =>
      rule.title.toLowerCase().includes(search.toLowerCase()) ||
      rule.summary.toLowerCase().includes(search.toLowerCase()) ||
      rule.clauses.some(
        (c) =>
          c.heading.toLowerCase().includes(search.toLowerCase()) ||
          c.body.toLowerCase().includes(search.toLowerCase())
      )
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1128] via-[#101c4e] to-[#1a237e] text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1128] via-[#101c4e] to-[#1a237e] border border-blue-800/60 p-8 sm:p-10 shadow-2xl">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e5b53e]/15 border border-[#e5b53e]/40 text-[#e5b53e] text-xs font-bold tracking-wider uppercase">
              <BookOpen className="w-3.5 h-3.5 text-[#e5b53e]" />
              EFF Official Codex of Regulations
            </div>

            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              OFFICIAL FEDERATION{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ffe066] via-[#e5b53e] to-[#ffb300]">
                RULES & REGULATIONS
              </span>
            </h1>

            <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
              The 8 official statutes governing competitive eSports play, tournament deadlines,
              match verification, accumulator betting protocols, coin rewards, and administrative governance.
            </p>

            {/* Search Input */}
            <div className="pt-2 max-w-md">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search rules, clauses, or keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00b4ff] transition shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expand/Collapse All buttons */}
        <div className="flex items-center justify-between text-xs text-blue-200 px-1">
          <span>
            Displaying {filteredRules.length} of {EFF_RULES.length} Federation Statutes
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenSectionId(null)}
              className="text-blue-300 hover:text-white transition underline"
            >
              Collapse All
            </button>
            <span>•</span>
            <button
              onClick={() => setOpenSectionId(-1)}
              className="text-[#e5b53e] hover:underline transition font-bold"
            >
              Expand All
            </button>
          </div>
        </div>

        {/* Rules Accordion List (White Cards with subtle blue-gray shadow) */}
        <div className="space-y-4">
          {filteredRules.map((rule) => {
            const Icon = rule.icon;
            const isOpen = openSectionId === -1 || openSectionId === rule.id;

            return (
              <div
                key={rule.id}
                className={`bg-white text-slate-900 border rounded-2xl overflow-hidden transition-all shadow-sm ${
                  isOpen ? "border-[#00b4ff]/60 shadow-md" : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                {/* Header Toggle */}
                <button
                  onClick={() =>
                    setOpenSectionId(openSectionId === rule.id ? null : rule.id)
                  }
                  className="w-full p-5 text-left flex items-start sm:items-center justify-between gap-4 bg-white hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {rule.badge}
                        </span>
                      </div>
                      <h2 className="font-black text-base sm:text-lg text-[#0f172a]">
                        {rule.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                        {rule.summary}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Expanded Body */}
                {isOpen && (
                  <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    <p className="text-xs text-slate-600 sm:hidden pb-2 border-b border-slate-200">
                      {rule.summary}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rule.clauses.map((clause) => (
                        <div
                          key={clause.number}
                          className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-2 hover:border-[#00b4ff]/40 shadow-xs transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                              § {clause.number}
                            </span>
                            <h3 className="font-bold text-xs text-[#0f172a]">
                              {clause.heading}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {clause.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-sm">
          <div className="space-y-1">
            <h4 className="font-bold text-[#0f172a] text-sm">
              Ready to represent your club in the EFF?
            </h4>
            <p className="text-xs text-slate-500">
              Sign in to the Player Portal to view open registrations and submit entry requests.
            </p>
          </div>
          <Link
            href="/portal/login"
            className="flex items-center gap-2 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md transition hover:scale-105 flex-shrink-0"
          >
            Access Portal
            <ArrowRight className="w-4 h-4 text-[#0a1128]" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
