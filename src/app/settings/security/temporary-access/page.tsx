"use client";

import React, { useState, useEffect } from "react";
import { Clock, Plus, Shield, CheckCircle2, AlertTriangle, XCircle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import {
  TemporaryAccessService,
  TemporaryAccessException,
  getAllRoles,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

export default function TemporaryAccessPage() {
  const [exceptions, setExceptions] = useState<TemporaryAccessException[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [userName, setUserName] = useState("Alex Rivera");
  const [userEmail, setUserEmail] = useState("alex.rivera@gmail.com");
  const [elevatedRole, setElevatedRole] = useState("Data Steward");
  const [ticketId, setTicketId] = useState("CHG-9402");
  const [reason, setReason] = useState("Emergency database schema reconciliation fix");
  const [durationHours, setDurationHours] = useState(24);

  const roles = getAllRoles();

  useEffect(() => {
    setExceptions(TemporaryAccessService.getExceptions());
  }, []);

  const handleCreateException = (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date();
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const created = TemporaryAccessService.addException({
      userId: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      userName: userName.trim(),
      userEmail: userEmail.trim(),
      elevatedRole,
      ticketId: ticketId.trim(),
      reason: reason.trim(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      approverName: "Sarah Jenkins (Platform Lead)",
      approverEmail: "sarah.jenkins@gmail.com",
    });

    setExceptions(TemporaryAccessService.getExceptions());
    setModalOpen(false);
  };

  const handleRevoke = (id: string) => {
    TemporaryAccessService.revokeException(id);
    setExceptions(TemporaryAccessService.getExceptions());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-default">Temporary Privileged Access (JIT)</h2>
          <p className="text-xs text-secondary">
            Grant time-boxed, auto-expiring access elevations tied to authorized change records or incident tickets.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setModalOpen(true)}
        >
          Request JIT Elevation
        </Button>
      </div>

      {/* Info notice */}
      <div className="p-4 rounded-lg bg-surface border border-border flex items-start gap-3 text-xs">
        <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-default">Time-Bounded Auto-Revocation</p>
          <p className="text-secondary leading-relaxed">
            Temporary privilege grants automatically expire when the designated end timestamp is reached. The policy engine ignores expired records during evaluation without requiring human intervention.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sunken border-b border-border text-[11px] uppercase tracking-wider text-muted font-bold">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Elevated Role</th>
                <th className="px-4 py-3">Ticket / Reason</th>
                <th className="px-4 py-3">Duration & Expiration</th>
                <th className="px-4 py-3">Authorized By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exceptions.map((exc) => {
                const isExpired = new Date(exc.endDate).getTime() <= Date.now() || exc.status === "expired";
                return (
                  <tr key={exc.id} className="hover:bg-sunken/40 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-default">{exc.userName}</p>
                        <p className="text-[11px] text-muted font-mono">{exc.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{exc.elevatedRole}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {exc.ticketId && (
                        <span className="font-mono text-[10px] bg-sunken px-1.5 py-0.5 rounded border border-border font-bold mr-1.5">
                          {exc.ticketId}
                        </span>
                      )}
                      <span className="text-secondary text-[11px] truncate">{exc.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-mono">
                        <p className="text-default">Expires: {new Date(exc.endDate).toLocaleString()}</p>
                        <p className="text-muted text-[10px]">Granted: {new Date(exc.startDate).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary text-[11px]">
                      {exc.approverName}
                    </td>
                    <td className="px-4 py-3">
                      <Lozenge
                        variant={
                          exc.status === "active" && !isExpired
                            ? "success"
                            : exc.status === "revoked"
                            ? "danger"
                            : "neutral"
                        }
                        size="xs"
                      >
                        {exc.status === "active" && !isExpired ? "Active" : exc.status === "revoked" ? "Revoked" : "Expired"}
                      </Lozenge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {exc.status === "active" && !isExpired && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(exc.id)}
                          className="text-xs text-danger hover:underline font-semibold"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* JIT Elevation Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-default">Request Just-In-Time (JIT) Elevation</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateException} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Target User *</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">User Email *</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. alex.rivera@gmail.com"
                  required
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Elevate to Role *</label>
                <select
                  value={elevatedRole}
                  onChange={(e) => setElevatedRole(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none"
                >
                  {Object.values(roles).map((r) => (
                    <option key={r.key} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-default block">Change / Ticket ID</label>
                  <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="e.g. CHG-9402"
                    className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-default block">Duration (Hours)</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none"
                  >
                    <option value={4}>4 Hours</option>
                    <option value={8}>8 Hours (1 Shift)</option>
                    <option value={24}>24 Hours</option>
                    <option value={72}>72 Hours (Weekend)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Business Justification *</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Approve & Grant Elevation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
