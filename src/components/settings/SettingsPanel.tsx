import { useState } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, User, Palette, Shield, Database, LogOut } from "lucide-react";
import { ProfileSettings } from "./ProfileSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { AgentPermissions } from "./AgentPermissions";
import { ImportExportSettings } from "./ImportExportSettings";

type SettingsTab = "profile" | "appearance" | "agents" | "import-export";

interface SettingsPanelProps {
  onBack: () => void;
  onLogout: () => void;
}

export function SettingsPanel({ onBack, onLogout }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="text-slate-600 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookmarks
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          </div>
          <Button variant="outline" onClick={onLogout} className="text-red-600 border-red-300 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl border border-slate-200 p-2 space-y-1 sticky top-24">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "profile"
                    ? "bg-cyan-100 text-cyan-900"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab("appearance")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "appearance"
                    ? "bg-cyan-100 text-cyan-900"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Palette className="w-4 h-4" />
                Appearance
              </button>
              <button
                onClick={() => setActiveTab("agents")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "agents"
                    ? "bg-cyan-100 text-cyan-900"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Shield className="w-4 h-4" />
                Agent Permissions
              </button>
              <button
                onClick={() => setActiveTab("import-export")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "import-export"
                    ? "bg-cyan-100 text-cyan-900"
                    : "text-slate-700 hover:bg-slate-100"
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