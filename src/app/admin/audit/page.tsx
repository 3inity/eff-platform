"use client";

import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  X,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  adminId: string;
  actionType: string;
  targetTable: string;
  targetId: string;
  oldValue: any;
  newValue: any;
  createdAt: string;
  isReverted: boolean;
  revertedBy: string | null;
  revertedAt: string | null;
  admin?: {
    player?: {
      username: string;
    };
  };
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [inspectModal, setInspectModal] = useState<AuditLogEntry | null>(null);

  const loadData = async () => {
    try {
      const [auditRes, meRes] = await Promise.all([
        fetch("/api/admin/audit?limit=100"),
        fetch("/api/auth/admin/me"),
      ]);

      const auditData = await auditRes.json();
      const meData = await meRes.json();

      setLogs(auditData.logs || []);
      setIsSuperAdmin(meData.admin?.role === "SUPER_ADMIN");
    } catch (err) {
      console.error("Error loading audit log:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevert = async (id: string, actionType: string) => {
    if (!isSuperAdmin) {
      alert("Only SUPER_ADMIN can execute action reversions.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to revert action: ${actionType}? This will restore the recorded previous state and write a new audit entry.`
      )
    ) {
      return;
    }

    setRevertingId(id);
    try {
      const res = await fetch(`/api/admin/audit/${id}/revert`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Action successfully reverted!");
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Reversion failed.");
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            Federation Audit Trail
          </h1>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Cryptographic-quality record of all administrative operations, results, and coin movements.
          </p>
        </div>

        {isSuperAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e5b53e]/20 text-[#ffe270] border border-[#e5b53e]/40 rounded-xl text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" /> SUPER_ADMIN Rollback Enabled
          </span>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a1128] text-white uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-3">Admin</th>
                <th className="py-3.5 px-3">Action Type</th>
                <th className="py-3.5 px-3">Target Table</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3 text-center">Payload</th>
                <th className="py-3.5 px-4 text-right">Rollback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const canRevert =
                    isSuperAdmin &&
                    !log.isReverted &&
                    log.oldValue &&
                    log.actionType !== "REVERT_ACTION";

                  return (
                    <tr
                      key={log.id}
                      className={
                        log.isReverted
                          ? "bg-gray-50/70 text-gray-400"
                          : "hover:bg-blue-50/50 transition"
                      }
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3 px-3 font-bold text-gray-900">
                        @{log.admin?.player?.username || "admin"}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] font-black text-[#e90052]">
                          {log.actionType}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-gray-700">
                        {log.targetTable}
                      </td>

                      <td className="py-3 px-3">
                        {log.isReverted ? (
                          <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded uppercase">
                            Reverted
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setInspectModal(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-bold transition"
                        >
                          <Eye className="w-3 h-3" /> Diff
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {log.isReverted ? (
                          <span className="text-[10px] text-gray-400 italic">
                            Rolled back
                          </span>
                        ) : canRevert ? (
                          <button
                            disabled={revertingId === log.id}
                            onClick={() => handleRevert(log.id, log.actionType)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-gray-950 rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm transition disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" /> Revert
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT DIFF MODAL */}
      {inspectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-black text-base uppercase tracking-tight text-gray-900">
                  Audit Snapshot: {inspectModal.actionType}
                </h3>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                  Target: {inspectModal.targetTable} • ID: {inspectModal.targetId}
                </p>
              </div>
              <button
                onClick={() => setInspectModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Old Value */}
              <div>
                <span className="block text-xs font-black uppercase text-red-700 tracking-wider mb-1">
                  Previous State (Old Value)
                </span>
                <pre className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-mono text-gray-800 overflow-x-auto max-h-64">
                  {inspectModal.oldValue
                    ? JSON.stringify(inspectModal.oldValue, null, 2)
                    : "(No previous snapshot)"}
                </pre>
              </div>

              {/* New Value */}
              <div>
                <span className="block text-xs font-black uppercase text-emerald-700 tracking-wider mb-1">
                  New State (Resulting Value)
                </span>
                <pre className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-mono text-gray-800 overflow-x-auto max-h-64">
                  {inspectModal.newValue
                    ? JSON.stringify(inspectModal.newValue, null, 2)
                    : "(No new state snapshot)"}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setInspectModal(null)}
                className="px-5 py-2 bg-gray-800 text-white font-bold text-xs rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
