import { useState, useEffect } from "react";
import { ProfileSettings } from "./components/ProfileSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import { AgentPermissions } from "./components/AgentPermissions";
import { ImportExportSettings } from "./components/ImportExportSettings";
import { Header } from "@/features/dashboard/components/layout/Header";
import { Sidebar } from "@/features/dashboard/components/layout/Sidebar";
import type { SettingsTab } from "@/features/dashboard/components/layout/SidebarNav";

interface SettingsPanelProps {
  onBack: () => void;
  onLogout: () => void;
}

export function SettingsPanel({ onBack, onLogout }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const saved = sessionStorage.getItem("cc_settings_tab");
    return (saved as SettingsTab) || "profile";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("cc_settings_tab", activeTab);
  }, [activeTab]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-30"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 h-full flex-none flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          folders={[]}
          selectedFolder={null}
          filterType="dashboard"
          searchQuery=""
          onSearchChange={() => {}}
          onSelectFolder={() => {}}
          onFilterChange={() => {}}
          onAddFolder={() => {}}
          onEditFolder={() => {}}
          onDeleteFolder={() => {}}
          bookmarkCounts={{ all: 0, starred: 0, archived: 0, tags: 0 }}
          settingsMode
          activeSettingsTab={activeTab}
          onSettingsTabChange={setActiveTab}
          onGoToDashboard={onBack}
          onLogout={onLogout}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <Header
          user={null}
          onGoToSettings={onBack}
          onLogout={onLogout}
          onShowDatabaseStats={() => {}}
          onAddBookmark={() => {}}
          showGridControls={false}
          sortBy="date-desc"
          onSortChange={() => {}}
          viewMode="grid"
          onViewChange={() => {}}
          tagFilter={null}
          onClearTagFilter={() => {}}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "agents" && <AgentPermissions />}
          {activeTab === "import-export" && <ImportExportSettings />}
        </div>
      </main>
    </div>
  );
}