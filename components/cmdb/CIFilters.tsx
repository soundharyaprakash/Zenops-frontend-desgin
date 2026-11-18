"use client";

import React from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CI_CLASSES, ENVIRONMENTS, OPERATIONAL_STATUSES, BUSINESS_CRITICALITIES } from "@/lib/constants";

export interface CIFilterState {
  search: string;
  ciClass: string;
  environment: string;
  operationalStatus: string;
  criticality: string;
  trustScoreMin: string;
}

interface CIFiltersProps {
  filters: CIFilterState;
  onChange: (filters: CIFilterState) => void;
  onReset: () => void;
  totalFiltered: number;
  totalAll: number;
}

export function CIFilters({
  filters,
  onChange,
  onReset,
  totalFiltered,
  totalAll,
}: CIFiltersProps) {
  const handleChange = (key: keyof CIFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const isFiltered =
    filters.search !== "" ||
    filters.ciClass !== "" ||
    filters.environment !== "" ||
    filters.operationalStatus !== "" ||
    filters.criticality !== "" ||
    filters.trustScoreMin !== "";

  return (
    <div className="bg-surface rounded-lg border border-border p-3.5 shadow-subtle space-y-2.5 text-foreground">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Search Input */}
        <div className="sm:col-span-2 md:col-span-3 lg:col-span-2">
          <Input
            placeholder="Search CIs (Name, ID, IP, or Owner)..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-muted" />}
          />
        </div>

        {/* CI Class Filter */}
        <div>
          <Select
            value={filters.ciClass}
            onChange={(e) => handleChange("ciClass", e.target.value)}
          >
            <option value="">All CI Classes</option>
            {CI_CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </Select>
        </div>

        {/* Environment Filter */}
        <div>
          <Select
            value={filters.environment}
            onChange={(e) => handleChange("environment", e.target.value)}
          >
            <option value="">All Environments</option>
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </Select>
        </div>

        {/* Operational Status Filter */}
        <div>
          <Select
            value={filters.operationalStatus}
            onChange={(e) => handleChange("operationalStatus", e.target.value)}
          >
            <option value="">All Operational Statuses</option>
            {OPERATIONAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>

        {/* Criticality Filter */}
        <div>
          <Select
            value={filters.criticality}
            onChange={(e) => handleChange("criticality", e.target.value)}
          >
            <option value="">All Criticalities</option>
            {BUSINESS_CRITICALITIES.map((crit) => (
              <option key={crit} value={crit}>
                {crit.split(" - ")[0]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Filter Status Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted">
        <span>
          Showing <strong className="text-foreground">{totalFiltered}</strong> of{" "}
          <strong className="text-foreground">{totalAll}</strong> Configuration Items
        </span>

        {isFiltered && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onReset}
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
