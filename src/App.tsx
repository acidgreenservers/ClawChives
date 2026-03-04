import { useState, useEffect } from "react";
import { LandingPage } from "./components/landing/LandingPage";
import { LoginForm } from "./components/auth/LoginForm";
import { SetupWizard } from "./components/auth/SetupWizard";
import { Dashboard } from "./components/dashboard/Dashboard";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { DatabaseStatsModal } from "./components/dashboard/DatabaseStatsModal";
import * as IndexedDB from "./lib/indexedDB";

type View = "landing" | "login" | "setup" | "dashboard" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>("landing");
  const [, setIsAuthenticated] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const keys = await IndexedDB.getAllAgentKeys();
      if (keys.length > 0) {
        setIsAuthenticated(true);
        setCurrentView("dashboard");
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

  const handleSetupComplete = () => {
    setIsAuthenticated(true);
    setCurrentView("dashboard");
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView("landing");
  };

  const handleGoToSettings = () => {
    setCurrentView("settings");
  };

  const handleBackToDashboard = () => {
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
          onSuccess={handleLoginSuccess}
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