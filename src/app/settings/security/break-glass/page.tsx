"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  History,
  AlertOctagon,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import { AccessAuditService, can, PERMISSIONS } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface BreakGlassEvent {
  id: string;
  timestamp: string;
  actor: string;
  reason: string;
  ticketId: string;
  status: "active" | "terminated";
  durationMinutes: number;
}

export default function BreakGlassPage() {
  const [activeSession, setActiveSession] = useState<BreakGlassEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ticketId, setTicketId] = useState("INC-9912");
  const [reason, setReason] = useState("Major datacenter power outage - emergency service recovery");
  const [secondaryAuthOfficer, setSecondaryAuthOfficer] = useState("David Chen (CISO On-Call)");
  const [recentEvents, setRecentEvents] = useState<BreakGlassEvent[]>([
    {
      id: "BG-EVT-001",
      timestamp: "2026-10-30T04:15:00Z",
      actor: "sec-breakglass-01",
      reason: "Emergency root cert rotation following global CA breach advisory",
      ticketId: "INC-8821",
      status: "terminated",
      durationMinutes: 45,
    },
  ]);

  const handleActivateBreakGlass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !ticketId.trim()) return;

    const event: BreakGlassEvent = {
      id: `BG-EVT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: "sec-breakglass-01 (Emergency Principal)",
      reason: reason.trim(),
      ticketId: ticketId.trim(),
      status: "active",
      durationMinutes: 60,
    };

    // Raise critical security alert in immutable audit stream
    AccessAuditService.append({
      actorId: "sec-breakglass-01",
      actorEmail: "breakglass.sec@zenops.local",
      actorName: "Emergency Break-Glass Principal",
      actorRole: "Break-glass Administrator",
      permission: PERMISSIONS.CI_EDIT,
      tenantId: "CMP_1001_ZENDEV",
      allowed: true,
      reason: `SECURITY ALERT: Emergency Break-Glass account activated. Ticket: ${ticketId.trim()}. Justification: ${reason.trim()}. Dual-authorized by: ${secondaryAuthOfficer}.`,
      auditFlag: "SECURITY_ALERT_BREAK_GLASS_USED",
      metadata: {
        ticketId: ticketId.trim(),
        secondaryAuthOfficer,
        eventId: event.id,
      },
    });

    setActiveSession(event);
    setRecentEvents([event, ...recentEvents]);
    setModalOpen(false);
  };

  const handleTerminateBreakGlass = () => {
    if (!activeSession) return;
    const terminated: BreakGlassEvent = { ...activeSession, status: "terminated" };

    AccessAuditService.append({
      actorId: "sec-breakglass-01",
      actorEmail: "breakglass.sec@zenops.local",
      actorName: "Emergency Break-Glass Principal",
      actorRole: "Break-glass Administrator",
      permission: PERMISSIONS.CI_EDIT,
      tenantId: "CMP_1001_ZENDEV",
      allowed: true,
      reason: `Emergency Break-Glass session terminated. Session ID: ${activeSession.id}. Total duration: 12 minutes. Credential vault auto-locked.`,
      auditFlag: "SECURITY_ALERT_BREAK_GLASS_TERMINATED",
    });

    setActiveSession(null);
    setRecentEvents((prev) =>
      prev.map((e) => (e.id === activeSession.id ? terminated : e))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-default">Break-Glass Emergency Access Control</h2>
          <p className="text-xs text-secondary">
            Hardware-vaulted emergency credential reserve for disaster recovery and catastrophic outage response. Any usage dispatches immediate critical alerts to the SOC.
          </p>
        </div>
        {!activeSession ? (
          <Button
            variant="danger"
            size="sm"
            leftIcon={<KeyRound className="w-3.5 h-3.5" />}
            onClick={() => setModalOpen(true)}
          >
            Activate Emergency Break-Glass
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Lock className="w-3.5 h-3.5 text-rose-600" />}
            onClick={handleTerminateBreakGlass}
          >
            Lock & Terminate Session
          </Button>
        )}
      </div>

      {/* Active Session Warning Banner */}
      {activeSession && (
        <div className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-900 dark:text-rose-100 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-bold text-sm">
                CRITICAL ALERT: Emergency Break-Glass Session Active
              </span>
            </div>
            <Lozenge variant="danger" size="xs">
              Live Surveillance Active
            </Lozenge>
          </div>
          <p className="text-secondary text-[11px]">
            Incident Ref: <span className="font-mono font-semibold text-rose-700 dark:text-rose-300">{activeSession.ticketId}</span> &bull; Reason: {activeSession.reason}
          </p>
          <div className="flex items-center justify-between text-[10px] text-muted pt-2 border-t border-rose-500/20">
            <span>Activated at: {new Date(activeSession.timestamp).toLocaleTimeString()}</span>
            <span className="font-mono">Audit Alert Flag: SECURITY_ALERT_BREAK_GLASS_USED</span>
          </div>
        </div>
      )}

      {/* Break-Glass Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-2 shadow-xs">
          <span className="text-xs font-bold text-default uppercase tracking-wider block">
            Vault State
          </span>
          <div className="flex items-center gap-2">
            {activeSession ? (
              <>
                <Unlock className="w-4 h-4 text-rose-600" />
                <span className="font-bold text-sm text-rose-600">Vault Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-emerald-600">Encrypted in HSM</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-secondary">
            Hardware security module with dual-split encryption keys requiring executive authorization.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-2 shadow-xs">
          <span className="text-xs font-bold text-default uppercase tracking-wider block">
            Surveillance Protocol
          </span>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-default">Real-Time SOC Feed</span>
          </div>
          <p className="text-[11px] text-secondary">
            Every query and mutation under this account triggers an immediate SEV-1 incident notification.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-2 shadow-xs">
          <span className="text-xs font-bold text-default uppercase tracking-wider block">
            Credential Principal
          </span>
          <div className="font-mono text-xs font-bold text-default">
            breakglass.sec@zenops.local
          </div>
          <p className="text-[11px] text-secondary">
            Isolated account completely decoupled from SSO identity providers for offline continuity.
          </p>
        </div>
      </div>

      {/* Audit History of Break-Glass Events */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-default uppercase tracking-wider">
          Break-Glass Activation Audit Trail
        </h3>
        <div className="space-y-2">
          {recentEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-3 rounded-lg border border-border bg-sunken/40 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-default">
                  {evt.id} &bull; {evt.actor}
                </span>
                <Lozenge
                  variant={evt.status === "active" ? "danger" : "neutral"}
                  size="xs"
                >
                  {evt.status.toUpperCase()}
                </Lozenge>
              </div>
              <p className="text-secondary text-[11px]">{evt.reason}</p>
              <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-border/40 font-mono">
                <span>Incident Ref: {evt.ticketId}</span>
                <span>{new Date(evt.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-default">
                  Emergency Break-Glass Authorization
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActivateBreakGlass} className="space-y-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-800 dark:text-rose-200">
                <p className="font-bold">WARNING: High-Priority Emergency Protocol</p>
                <p className="mt-1 text-[11px]">
                  Activating this emergency credential dispatches real-time security alerts to executive leadership and the SOC. All actions are immutably logged.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">
                  Incident or Change Ticket ID (Mandatory) *
                </label>
                <input
                  type="text"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  required
                  placeholder="e.g. INC-9912 or CHG-4401"
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">
                  Emergency Business Justification *
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="Describe catastrophic condition necessitating break-glass..."
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">
                  Secondary Authorizing Officer (Dual Custody) *
                </label>
                <select
                  value={secondaryAuthOfficer}
                  onChange={(e) => setSecondaryAuthOfficer(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default"
                >
                  <option value="David Chen (CISO On-Call)">David Chen (CISO On-Call)</option>
                  <option value="Marcus Vance (VP Infrastructure)">Marcus Vance (VP Infrastructure)</option>
                  <option value="Sarah Jenkins (Platform Eng Lead)">Sarah Jenkins (Platform Eng Lead)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" type="submit">
                  Authorize & Unlock Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
