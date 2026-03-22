import { LayoutDashboard, Folder, Star, Tag, Archive, Settings, User, Palette, Shield, Database } from "lucide-react";

export type NavTab = "dashboard" | "all" | "starred" | "tags" | "archived";
export type SettingsTab = "profile" | "appearance" | "agents" | "import-export";

interface SidebarNavProps {
  filterType: NavTab;
  selectedFolder: string | null;
  onFilterChange: (filter: NavTab) => void;
  onSelectFolder: (folderId: string | null) => void;
  bookmarkCounts: {
    all: number;
    starred: number;
    archived: number;
    tags: number;
  };
  // Settings mode
  settingsMode?: boolean;
  activeSettingsTab?: SettingsTab;
  onSettingsTabChange?: (tab: SettingsTab) => void;
  onGoToSettings?: () => void;
  onGoToDashboard?: () => void;
}

export function SidebarNav({
  filterType,
  selectedFolder,
  onFilterChange,
  onSelectFolder,
  bookmarkCounts,
  settingsMode,
  activeSettingsTab,
  onSettingsTabChange,
  onGoToSettings,
  onGoToDashboard,
}: SidebarNavProps) {
  const inactiveBadge = "text-xs bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full";

  if (settingsMode && activeSettingsTab && onSettingsTabChange && onGoToDashboard) {
    const settingsNavItems = [
      {
        id: "profile" as SettingsTab,
        label: "Profile",
        icon: User,
        active: "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
      },
      {
        id: "appearance" as SettingsTab,
        label: "Appearance",
        icon: Palette,
        active: "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
      },
      {
        id: "agents" as SettingsTab,
        label: "Lobster Keys",
        icon: Shield,
        active: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      },
      {
        id: "import-export" as SettingsTab,
        label: "Import / Export",
        icon: Database,
        active: "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
      },
    ];

    return (
      <nav className="space-y-1">
        {settingsNavItems.map(({ id, label, icon: Icon, active }) => {
          const isActive = activeSettingsTab === id;
          return (
            <button
              key={id}
              onClick={() => onSettingsTabChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? active : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
        <div className="border-t border-slate-200 dark:border-slate-800 my-2" />
        <button
          onClick={onGoToDashboard}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Dashboard
        </button>
      </nav>
    );
  }

  const navItems = [
    {
      id: "dashboard" as NavTab,
      label: "Dashboard",
      icon: LayoutDashboard,
      active: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-300",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      badge: null,
    },
    {
      id: "all" as NavTab,
      label: "All Pinchmarks",
      icon: Folder,
      active: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      activeBadge: "text-xs bg-cyan-200 text-cyan-900 dark:bg-cyan-800 dark:text-cyan-100 px-2 py-0.5 rounded-full",
      badge: bookmarkCounts.all,
    },
    {
      id: "starred" as NavTab,
      label: "Starred",
      icon: Star,
      active: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      activeBadge: "text-xs bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 px-2 py-0.5 rounded-full",
      badge: bookmarkCounts.starred,
    },
    {
      id: "tags" as NavTab,
      label: "Tags",
      icon: Tag,
      active: "bg-sky-700 text-white dark:bg-sky-800 dark:text-white",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      activeBadge: "text-xs bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100 px-2 py-0.5 rounded-full",
      badge: bookmarkCounts.tags,
    },
    {
      id: "archived" as NavTab,
      label: "Archived",
      icon: Archive,
      active: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      activeBadge: "text-xs bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100 px-2 py-0.5 rounded-full",
      badge: bookmarkCounts.archived,
    },
  ];

  return (
    <nav className="space-y-1">
      {navItems.map(({ id, label, icon: Icon, active, inactive, badge, activeBadge }) => {
        const isActive = selectedFolder === null && filterType === id;
        return (
          <button
            key={id}
            onClick={() => {
              onSelectFolder(null);
              onFilterChange(id);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? active : inactive}`}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            {badge !== null && badge !== undefined && (
              <span className={isActive && activeBadge ? activeBadge : inactiveBadge}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
      {onGoToSettings && (
        <>
          <div className="border-t border-slate-200 dark:border-slate-800 my-2" />
          <button
            onClick={onGoToSettings}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </>
      )}
    </nav>
  );
}
