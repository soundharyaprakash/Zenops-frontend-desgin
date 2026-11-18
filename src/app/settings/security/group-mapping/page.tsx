"use client";

import React, { useState } from "react";
import { Users, Plus, Shield, ArrowRight, RefreshCw, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import {
  GroupMappingService,
  GroupRoleMapping,
  DEFAULT_GROUP_MAPPINGS,
  getAllRoles,
} from "@/lib/rbac";

export default function GroupMappingPage() {
  const [mappings, setMappings] = useState<GroupRoleMapping[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedRoleKey, setSelectedRoleKey] = useState("cmdb_admin");
  const [syncSource, setSyncSource] = useState<GroupRoleMapping["syncSource"]>("Okta SCIM");

  const roles = getAllRoles();

  React.useEffect(() => {
    setMappings(GroupMappingService.getMappings());
  }, []);

  const handleCreateMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.trim()) return;

    const roleDef = roles[selectedRoleKey];
    const newEntry: GroupRoleMapping = {
      id: `GM-${Math.floor(200 + Math.random() * 800)}`,
      groupName: newGroup.trim(),
      groupDescription: newDesc.trim() || `Mapped to ${roleDef?.name}`,
      roleKey: selectedRoleKey,
      roleName: roleDef?.name || selectedRoleKey,
      mappedAt: new Date().toISOString(),
      userCount: 1,
      syncSource,
    };

    const updated = [...mappings, newEntry];
    setMappings(updated);
    GroupMappingService.saveMappings(updated);
    setModalOpen(false);
    setNewGroup("");
    setNewDesc("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-default">Directory Group to Role Mappings</h2>
          <p className="text-xs text-secondary">
            Map incoming IdP directory groups (Okta, Azure AD, Google Workspace) directly into ZenOps CMDB roles. Users inherit roles automatically on every login.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setModalOpen(true)}
        >
          Add Group Mapping
        </Button>
      </div>

      {/* Enterprise Architecture Notice */}
      <div className="p-4 rounded-lg bg-surface border border-border flex items-start gap-3 text-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-default">Dynamic SCIM 2.0 & SAML/OIDC Resolution</p>
          <p className="text-secondary leading-relaxed">
            When a user authenticates via SSO, their <code>groups[]</code> claim is extracted from the SAML Assertion or OIDC ID Token and matched against this table. If a user is removed from a directory group in your IdP, access terminates instantly at their next session refresh.
          </p>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sunken border-b border-border text-[11px] uppercase tracking-wider text-muted font-bold">
              <tr>
                <th className="px-4 py-3">Directory Group</th>
                <th className="px-4 py-3">Sync Provider</th>
                <th className="px-4 py-3">Mapped CMDB Role</th>
                <th className="px-4 py-3">Active Users</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappings.map((item) => (
                <tr key={item.id} className="hover:bg-sunken/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-default">
                    <span className="bg-sunken px-2 py-1 rounded border border-border">
                      {item.groupName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Lozenge
                      variant={
                        item.syncSource.includes("Okta")
                          ? "info"
                          : item.syncSource.includes("Azure")
                          ? "discovery"
                          : "success"
                      }
                      size="xs"
                    >
                      {item.syncSource}
                    </Lozenge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{item.roleName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted">{item.userCount} users</td>
                  <td className="px-4 py-3 text-secondary max-w-md truncate">
                    {item.groupDescription}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Mapping Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-default">Add Group Role Mapping</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMapping} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Directory Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. SRE-Database-Owners"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  required
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Target CMDB Role *</label>
                <select
                  value={selectedRoleKey}
                  onChange={(e) => setSelectedRoleKey(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {Object.values(roles).map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name} ({r.permissions.length} perms)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Sync Source</label>
                <select
                  value={syncSource}
                  onChange={(e) => setSyncSource(e.target.value as any)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none"
                >
                  <option value="Okta SCIM">Okta SCIM 2.0</option>
                  <option value="Azure AD SAML">Microsoft Entra ID (Azure AD)</option>
                  <option value="Google Workspace OIDC">Google Workspace OIDC</option>
                  <option value="Local LDAP">Corporate LDAP / Active Directory</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Database cluster technical custodians"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Mapping
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
