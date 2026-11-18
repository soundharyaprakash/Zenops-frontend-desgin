"use client";

import React, { useState, useMemo } from "react";
import {
  Shield,
  Copy,
  Plus,
  Search,
  Check,
  Lock,
  Calendar,
  User,
  Sliders,
  Sparkles,
  Info,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import {
  getAllRoles,
  saveCustomRole,
  RoleDefinition,
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  PermissionKey,
  SCOPE_POLICIES,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<Record<string, RoleDefinition>>({});
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("cmdb_admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Modals state
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [targetCopyRole, setTargetCopyRole] = useState<RoleDefinition | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<PermissionKey[]>([]);

  React.useEffect(() => {
    setRoles(getAllRoles());
  }, []);

  const roleList = useMemo(() => {
    return Object.values(roles).filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "All" || role.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [roles, searchQuery, categoryFilter]);

  const selectedRole = roles[selectedRoleKey] || roleList[0];

  const handleOpenCopy = (role: RoleDefinition) => {
    setTargetCopyRole(role);
    setNewRoleName(`${role.name} (Custom Copy)`);
    setNewRoleDesc(`Custom variant based on ${role.name}: ${role.description}`);
    setSelectedPerms([...role.permissions]);
    setCopyModalOpen(true);
  };

  const handleSaveCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const customKey = `custom_${newRoleName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString().slice(-4)}`;
    const newRole: RoleDefinition = {
      key: customKey,
      name: newRoleName.trim(),
      description: newRoleDesc.trim(),
      permissions: selectedPerms,
      scopeRule: targetCopyRole?.scopeRule || SCOPE_POLICIES.WHOLE_TENANT,
      owner: "Security Administrator",
      reviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      isSystem: false,
      category: "CMDB Core",
      badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    };

    saveCustomRole(newRole);
    setRoles(getAllRoles());
    setSelectedRoleKey(customKey);
    setCopyModalOpen(false);
  };

  const togglePermission = (perm: PermissionKey) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-default">System & Custom Roles</h2>
          <p className="text-xs text-secondary">
            System roles are protected enterprise baselines. Copy any system role to customize scoped permission sets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => handleOpenCopy(roles["data_steward"] || roles["cmdb_admin"])}
          >
            Create Custom Role
          </Button>
        </div>
      </div>

      {/* Main Grid: Left List + Right Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Role List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles..."
                className="w-full bg-surface border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-default placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs text-default focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="CMDB Core">CMDB Core</option>
              <option value="Ownership">Ownership</option>
              <option value="ITIL Operations">ITIL Operations</option>
              <option value="Governance & Audit">Governance</option>
              <option value="Automated">Automated</option>
            </select>
          </div>

          {/* Role Cards List */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1 scrollbar-thin">
            {roleList.map((role) => {
              const isSelected = selectedRole?.key === role.key;
              return (
                <div
                  key={role.key}
                  onClick={() => setSelectedRoleKey(role.key)}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer text-left space-y-1.5",
                    isSelected
                      ? "bg-selected/60 border-primary shadow-xs"
                      : "bg-surface border-border hover:border-border-strong hover:bg-sunken/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-xs text-default truncate">{role.name}</span>
                      {role.isSystem ? (
                        <span className="text-[10px] uppercase font-bold text-muted bg-sunken px-1.5 py-0.2 rounded border border-border">
                          System
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-muted shrink-0">
                      {role.permissions.length} perms
                    </span>
                  </div>

                  <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-muted border-t border-border/40">
                    <span>Scope: {role.scopeRule.type.replace(/_/g, " ")}</span>
                    {role.autoGrantRule && (
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Auto-granted
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Role Detail View */}
        <div className="lg:col-span-7">
          {selectedRole ? (
            <div className="bg-surface border border-border rounded-xl p-6 space-y-6 shadow-xs sticky top-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-default">{selectedRole.name}</h3>
                    {selectedRole.isSystem ? (
                      <Lozenge variant="neutral" size="xs">
                        System Role (Protected)
                      </Lozenge>
                    ) : (
                      <Lozenge variant="warning" size="xs">
                        Custom Role
                      </Lozenge>
                    )}
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">{selectedRole.description}</p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenCopy(selectedRole)}
                  className="shrink-0"
                >
                  Copy Role
                </Button>
              </div>

              {/* Metadata Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-sunken rounded-lg border border-border text-xs">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Scope Rule</span>
                  <span className="font-semibold text-default capitalize">
                    {selectedRole.scopeRule.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Role Owner</span>
                  <span className="font-semibold text-default truncate block">{selectedRole.owner}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Review Cadence</span>
                  <span className="font-semibold text-default">{selectedRole.reviewDate}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Auto-Grant</span>
                  <span className="font-semibold text-default">
                    {selectedRole.autoGrantRule ? "Derived from Data" : "Manual / SSO"}
                  </span>
                </div>
              </div>

              {/* Auto-Grant Explanation Card (if applicable) */}
              {selectedRole.autoGrantRule && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-2.5 text-xs text-primary">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-brand-blue" />
                  <div>
                    <p className="font-semibold text-default">Dynamic Data-Derived Role</p>
                    <p className="text-secondary mt-0.5">
                      {selectedRole.autoGrantRule === "ci_ownership"
                        ? "Anyone who is designated as the owner or belongs to the owner group of at least one CI receives this role automatically. When a CI's ownership changes, permissions follow instantly."
                        : "Anyone registered as the technical or business owner of a registered service receives this role dynamically for their downstream service dependencies."}
                    </p>
                  </div>
                </div>
              )}

              {/* Scope Boundary Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-default uppercase tracking-wider block">
                  Enforced Scope Policy
                </span>
                <p className="text-xs text-secondary p-3 bg-surface border border-border rounded-md">
                  {selectedRole.scopeRule.description}
                </p>
              </div>

              {/* Assigned Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-default uppercase tracking-wider">
                    Permissions ({selectedRole.permissions.length} Granted)
                  </span>
                  <span className="text-[11px] text-muted">Least privilege enforced</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((permKey) => {
                    const isGranted = selectedRole.permissions.includes(permKey);
                    const def = PERMISSION_CATALOG[permKey];
                    return (
                      <div
                        key={permKey}
                        className={cn(
                          "p-2.5 rounded-md border text-xs flex items-start gap-2.5 transition-colors",
                          isGranted
                            ? "bg-surface border-border text-default"
                            : "bg-sunken/40 border-border/40 text-muted opacity-50"
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            isGranted ? "bg-emerald-500/10 text-emerald-600" : "bg-neutral-500/10 text-neutral-400"
                          )}
                        >
                          {isGranted ? <Check className="w-3 h-3" /> : <Lock className="w-2.5 h-2.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[11px] font-mono">{permKey}</p>
                          <p className="text-[10px] text-secondary leading-snug truncate">{def?.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-muted border border-dashed rounded-xl">
              Select a role to inspect its configuration.
            </div>
          )}
        </div>
      </div>

      {/* Copy Role Modal */}
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-default">
                  Clone Role: {targetCopyRole?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomRole} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Custom Role Name *</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Description</label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-default block">
                  Selected Permissions ({selectedPerms.length})
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-border p-2 rounded-md bg-sunken/40">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = selectedPerms.includes(perm);
                    return (
                      <label
                        key={perm}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs select-none transition-colors",
                          checked ? "bg-selected/70 text-primary font-medium" : "hover:bg-sunken text-secondary"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm)}
                          className="rounded border-border text-primary h-3.5 w-3.5"
                        />
                        <span className="font-mono text-[11px] truncate">{perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setCopyModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Custom Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
