"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  ChevronRight,
  ChevronDown,
  Server,
  Database,
  Cloud,
  Radio,
  FileCode,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

interface ClassNode {
  id: string;
  className: string;
  label: string;
  path: string;
  icon: any;
  ciCount: number;
  attributes: string[];
  children?: ClassNode[];
}

export function ClassHierarchyView() {
  const { cis, activeTenant } = useCMDB();
  const [selectedNode, setSelectedNode] = useState<ClassNode | null>(null);

  const hierarchy: ClassNode[] = [
    {
      id: "cmdb_ci",
      className: "cmdb_ci",
      label: "Base Configuration Item",
      path: "cmdb_ci",
      icon: Layers,
      ciCount: cis.length,
      attributes: ["name", "sys_class_name", "operational_status", "lifecycle_status", "owner", "support_group", "environment", "business_criticality"],
      children: [
        {
          id: "cmdb_ci_hardware",
          className: "cmdb_ci_hardware",
          label: "Hardware & Physical",
          path: "cmdb_ci > cmdb_ci_hardware",
          icon: Server,
          ciCount: cis.filter((c) => c.ciClass === "Server/VM" || c.ciClass === "Network Device").length,
          attributes: ["serial_number", "asset_tag", "mac_address", "vendor", "model", "location", "warranty_expiration"],
          children: [
            {
              id: "cmdb_ci_server",
              className: "cmdb_ci_server",
              label: "Server & Virtual Machine",
              path: "cmdb_ci > cmdb_ci_hardware > cmdb_ci_server",
              icon: Server,
              ciCount: cis.filter((c) => c.ciClass === "Server/VM").length,
              attributes: ["os", "os_version", "cpu_count", "ram", "disk_space", "fqdn"],
            },
            {
              id: "cmdb_ci_network_switch",
              className: "cmdb_ci_network_switch",
              label: "Network Switch & Router",
              path: "cmdb_ci > cmdb_ci_hardware > cmdb_ci_network_switch",
              icon: Radio,
              ciCount: cis.filter((c) => c.ciClass === "Network Device").length,
              attributes: ["port_count", "ip_address", "firmware_version", "default_gateway"],
            },
          ],
        },
        {
          id: "cmdb_ci_appl",
          className: "cmdb_ci_appl",
          label: "Application & Software",
          path: "cmdb_ci > cmdb_ci_appl",
          icon: FileCode,
          ciCount: cis.filter((c) => c.ciClass === "Application" || c.ciClass === "Database").length,
          attributes: ["application_type", "version", "install_directory"],
          children: [
            {
              id: "cmdb_ci_database",
              className: "cmdb_ci_database",
              label: "Database Instance",
              path: "cmdb_ci > cmdb_ci_appl > cmdb_ci_database",
              icon: Database,
              ciCount: cis.filter((c) => c.ciClass === "Database").length,
              attributes: ["engine", "port", "storage_size_gb", "collation", "backup_schedule"],
            },
          ],
        },
        {
          id: "cmdb_ci_cloud",
          className: "cmdb_ci_cloud",
          label: "Cloud & Virtual Infrastructure",
          path: "cmdb_ci > cmdb_ci_cloud",
          icon: Cloud,
          ciCount: cis.filter((c) => c.ciClass === "Cloud Resource" || c.ciClass === "Container/Pod").length,
          attributes: ["provider", "region", "arn", "account_id"],
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-12 text-text-default">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Class Hierarchy & Schema Designer
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              ServiceNow Compatible
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-1 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Browse object inheritance trees, parent-child schema relationships, and inherited attribute fields
          </p>
        </div>
      </div>

      {/* 2-Column Browser: Tree on Left, Attribute Schema on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-surface border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Class Inheritance Tree</CardTitle>
              <CardDescription className="text-sm">Select a node to inspect schema inheritance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {hierarchy.map((root) => (
                <div key={root.id} className="space-y-1.5">
                  <button
                    onClick={() => setSelectedNode(root)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-md flex items-center justify-between border transition-all text-sm",
                      selectedNode?.id === root.id
                        ? "bg-selected-bg border-primary font-semibold text-primary"
                        : "bg-sunken border-border/70 hover:bg-sunken/80 text-text-default"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-primary" />
                      <span>{root.label}</span>
                    </div>
                    <span className="font-mono text-xs text-text-muted">{root.ciCount} CIs</span>
                  </button>

                  {/* Children */}
                  <div className="pl-4 space-y-1.5 border-l-2 border-border/60 ml-2">
                    {root.children?.map((child) => (
                      <div key={child.id} className="space-y-1">
                        <button
                          onClick={() => setSelectedNode(child)}
                          className={cn(
                            "w-full text-left p-2 rounded-md flex items-center justify-between border text-xs sm:text-sm transition-all",
                            selectedNode?.id === child.id
                              ? "bg-selected-bg border-primary font-semibold text-primary"
                              : "bg-surface border-border hover:bg-sunken text-text-default"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <child.icon className="w-3.5 h-3.5 text-text-secondary" />
                            <span>{child.label}</span>
                          </div>
                          <span className="font-mono text-xs text-text-muted">{child.ciCount}</span>
                        </button>

                        {/* Grandchildren */}
                        {child.children && (
                          <div className="pl-3.5 space-y-1 border-l border-border/40 ml-2">
                            {child.children.map((grand) => (
                              <button
                                key={grand.id}
                                onClick={() => setSelectedNode(grand)}
                                className={cn(
                                  "w-full text-left p-1.5 rounded-md flex items-center justify-between border text-xs sm:text-sm transition-all",
                                  selectedNode?.id === grand.id
                                    ? "bg-selected-bg border-primary font-semibold text-primary"
                                    : "bg-surface border-border/60 hover:bg-sunken text-text-default"
                                )}
                              >
                                <div className="flex items-center gap-1.5">
                                  <grand.icon className="w-3.5 h-3.5 text-text-muted" />
                                  <span>{grand.label}</span>
                                </div>
                                <span className="font-mono text-xs text-text-muted">{grand.ciCount}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Schema Inspector */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-surface border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold">
                    {selectedNode ? selectedNode.label : "Select a Class Node"}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {selectedNode ? selectedNode.path : "Class schema metadata and inherited columns"}
                  </CardDescription>
                </div>
                {selectedNode && (
                  <Lozenge appearance="subtle" variant="info" size="sm">
                    {selectedNode.className}
                  </Lozenge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {selectedNode ? (
                <>
                  <div className="p-3.5 rounded-lg bg-sunken border border-border/80">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-1">
                      Inheritance Breadcrumbs
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-primary">{selectedNode.path}</span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2">
                      Active Attributes ({selectedNode.attributes.length} Fields)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedNode.attributes.map((attr) => (
                        <div
                          key={attr}
                          className="p-2.5 rounded-md bg-sunken/60 border border-border/60 font-mono text-xs text-text-default flex items-center justify-between"
                        >
                          <span className="truncate">{attr}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <Link href={`/cis?class=${selectedNode.label}`}>
                      <Button size="sm" variant="primary">
                        Browse {selectedNode.label} CIs &rarr;
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center text-text-muted text-sm">
                  <p>Click on any class in the tree on the left to inspect its schema and attributes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
