import { useState, useEffect } from "react";
import { LandingPage } from "./components/landing/LandingPage";
import { LoginForm } from "./components/auth/LoginForm";
import { SetupWizard } from "./components/auth/SetupWizard";
import { Dashboard } from "./components/dashboard/Dashboard";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { DatabaseStatsModal } from "./components/dashboard/DatabaseStatsModal";
import * as IndexedDB from "./lib/indexedDB";
import type { User } from "./lib/indexedDB";

type View = "landing" | "login" | "setup" | "dashboard" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>("landing");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  /** On startup: check if there's a session and restore it */
  const checkAuth = async () => {
    try {
      // Use localStorage for persistent sessions (survives browser close)
      const savedUUID = localStorage.getItem("cc_current_user_uuid");
      const savedView = localStorage.getItem("cc_view") as View;

      if (savedUUID) {
        // Load the user from IndexedDB
        const user = await IndexedDB.getUserByUUID(savedUUID);
        if (user) {
          setCurrentUser(user);
          // Restore the view
          if (savedView && ["dashboard", "settings"].includes(savedView)) {
            setCurrentView(savedView);
          } else {
            setCurrentView("dashboard");
          }
        } else {
          // User was deleted, clear stale session
          localStorage.removeItem("cc_current_user_uuid");
          localStorage.removeItem("cc_view");
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  };

  const handleCreateAccount = () => {
    setCurrentView("setup");
  };

  const handleLogin = () => {
    setCurrentView("login");
  };

  const handleSetupComplete = async (username: string, _token: string) => {
    try {
      // Get the newly created user
      const user = await IndexedDB.getUserByUsername(username);
      if (user) {
        localStorage.setItem("cc_current_user_uuid", user.uuid);
        localStorage.setItem("cc_view", "dashboard");
        setCurrentUser(user);
        setCurrentView("dashboard");
        console.log(`Account setup complete for ${username}`);
      }
    } catch (error) {
      console.error("Failed to complete setup:", error);
    }
  };

  const handleLoginSuccess = async (uuid: string) => {
    try {
      const user = await IndexedDB.getUserByUUID(uuid);
      if (user) {
        localStorage.setItem("cc_current_user_uuid", user.uuid);
        localStorage.setItem("cc_view", "dashboard");
        setCurrentUser(user);
        setCurrentView("dashboard");
      }
    } catch (error) {
      console.error("Failed to complete login:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cc_current_user_uuid");
    localStorage.removeItem("cc_view");
    setCurrentUser(null);
    setCurrentView("landing");
  };

  const handleGoToSettings = () => {
    localStorage.setItem("cc_view", "settings");
    setCurrentView("settings");
  };

  const handleBackToDashboard = () => {
    localStorage.setItem("cc_view", "dashboard");
    setCurrentView("dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {currentView === "landing" && (
        <LandingPage 
          onCreateAccount={handleCreateAccount}
          onLogin={handleLogin}
        />
      )}

      {currentView === "login" && (
        <LoginForm
          onSuccess={(uuid) => handleLoginSuccess(uuid)}
          onCancel={() => setCurrentView("landing")}
        />
      )}

      {currentView === "setup" && (
        <SetupWizard 
          onComplete={handleSetupComplete}
        />
      )}

      {currentView === "dashboard" && (
        <Dashboard 
          user={currentUser}
          onLogout={handleLogout}
          onGoToSettings={handleGoToSettings}
          onShowDatabaseStats={() => setShowDatabaseModal(true)}
        />
      )}

      {currentView === "settings" && (
        <SettingsPanel 
          onBack={handleBackToDashboard}
          onLogout={handleLogout}
        />
      )}

      <DatabaseStatsModal 
        isOpen={showDatabaseModal}
        onClose={() => setShowDatabaseModal(false)}
      />
    </div>
  );
}

export default App;