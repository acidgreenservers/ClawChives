import { LayoutGrid, List } from "lucide-react";

interface ViewToggleProps {
  viewMode: "grid" | "list";
  onChange: (mode: "grid" | "list") => void;
}

export function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      <button
        onClick={() => onChange("grid")}
        className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
        title="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
      <button
        onClick={() => onChange("list")}
        className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
