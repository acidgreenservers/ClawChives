import { ArrowUpDown } from "lucide-react";
import type { SortBy } from "../../lib/utils";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc",  label: "Oldest First" },
  { value: "name-asc",  label: "Name A→Z" },
  { value: "name-desc", label: "Name Z→A" },
];

interface SortDropdownProps {
  sortBy: SortBy;
  onChange: (sort: SortBy) => void;
}

export function SortDropdown({ sortBy, onChange }: SortDropdownProps) {
  return (
    <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
      <select
        value={sortBy}
        onChange={(e) => onChange(e.target.value as SortBy)}
        className="bg-transparent appearance-none cursor-pointer outline-none pr-2 text-sm"
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
