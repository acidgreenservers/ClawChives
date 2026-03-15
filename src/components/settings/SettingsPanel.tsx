import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, User, Palette, Shield, Database, LogOut } from "lucide-react";
import { ProfileSettings } from "./ProfileSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { AgentPermissions } from "./AgentPermissions";
import { ImportExportSettings } from "./ImportExportSettings";
import { InteractiveBrand } from "../Branding/InteractiveBrand";

type SettingsTab = "profile" | "appearance" | "agents" | "import-export";

interface SettingsPanelProps {
  onBack: () => void;
  onLogout: () => void;
}

export function SettingsPanel({ onBack, onLogout }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    // Load saved tab from sessionStorage on mount
    const saved = sessionStorage.getItem("cc_settings_tab");
    return (saved as SettingsTab) || "profile";
  });

  // Save active tab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem("cc_settings_tab", activeTab);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b-2 border-cyan-600 dark:border-red-500 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pinchmarks
            </Button>
            <div className="flex items-center gap-2">
              <InteractiveBrand onClick={onBack} />
              <span className="text-slate-500 dark:text-slate-400 font-normal text-lg ml-2">/ Settings</span>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="text-red-600 border-red-300 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-slate-900 rounded-xl border-2 border-red-500/30 dark:border-red-500/50 p-2 space-y-1 sticky top-24">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "profile"
                    ? "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab("appearance")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "appearance"
                    ? "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Palette className="w-4 h-4" />
                Appearance
              </button>
              <button
                onClick={() => setActiveTab("agents")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "agents"
                    ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Shield className="w-4 h-4" />
                Lobster Keys
              </button>
              <button
                onClick={() => setActiveTab("import-export")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "import-export"
                    ? "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Database className="w-4 h-4" />
                Import / Export
              </button>
            </nav>
          </aside>

          <main className="flex-1">
            {activeTab === "profile" && <ProfileSettings />}
            {activeTab === "appearance" && <AppearanceSettings />}
            {activeTab === "agents" && <AgentPermissions />}
            {activeTab === "import-export" && <ImportExportSettings />}
          </main>
        </div>
      </div>
    </div>
  );
}