import { useState, useEffect } from "react";
import { LandingPage } from "./components/landing/LandingPage";
import { LoginForm } from "./components/auth/LoginForm";
import { SetupWizard } from "./components/auth/SetupWizard";
import { Dashboard } from "./components/dashboard/Dashboard";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { DatabaseStatsModal } from "./components/dashboard/DatabaseStatsModal";
import { useDatabaseAdapter } from "./services/database/DatabaseProvider";
import { useTheme, type Theme } from "./components/theme-provider";

// Simplified user type
export interface User {
  username: string;
  uuid: string;
}

type View = "landing" | "login" | "setup" | "dashboard" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = sessionStorage.getItem("cc_view") as View;
    if (savedView && ["dashboard", "settings"].includes(savedView)) {
      return savedView;
    }
    return "landing";
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const uuid = sessionStorage.getItem("cc_user_uuid");
    const username = sessionStorage.getItem("cc_username");
    return uuid && username ? { uuid, username } : null;
  });

  const [showDatabaseModal, setShowDatabaseModal] = useState(false);

  const db = useDatabaseAdapter();
  const { setTheme } = useTheme();

  useEffect(() => {
    checkAuth();
  }, []);

  /** On startup: check if there's a session and restore it */
  const checkAuth = async () => {
    try {
      const token = sessionStorage.getItem("cc_api_token");
      const savedUUID = sessionStorage.getItem("cc_user_uuid");
      const savedUsername = sessionStorage.getItem("cc_username");
      const savedView = sessionStorage.getItem("cc_view") as View;

      if (token && savedUUID && savedUsername) {
        // 1. Immediately restore state from storage (no flash to landing)
        setCurrentUser({ uuid: savedUUID, username: savedUsername });
        if (savedView && ["dashboard", "settings"].includes(savedView)) {
          setCurrentView(savedView);
        } else {
          setCurrentView("dashboard");
        }

        // 2. Validate token in background (don't block the UI)
        // @ts-ignore: Vite replaces this at build-time
        const apiUrl = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://localhost:4242").replace(/\/$/, "");
        fetch(`${apiUrl}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(async (res) => {
          if (res.status === 401 || res.status === 403) {
            handleLogout();
          } else if (res.ok) {
            const data = await res.json();
            if (data.data?.keyType) {
              sessionStorage.setItem("cc_key_type", data.data.keyType);
            }
          }
        }).catch(() => {
          // Network errors/429s shouldn't kill the session
          console.warn("Background auth validation failed, but keeping session alive.");
        });

        // 3. Sync theme with backend
        try {
          if (db) {
            const settings = await db.getAppearanceSettings();
            if (settings?.theme) {
              setTheme(settings.theme as Theme);
            }
          }
        } catch (e) {
          console.error("Failed to sync appearance settings:", e);
        }
      } else {
        handleLogout();
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
      const uuid = sessionStorage.getItem("cc_user_uuid");
      if (uuid) {
        sessionStorage.setItem("cc_view", "dashboard");
        setCurrentUser({ username, uuid });
        setCurrentView("dashboard");
        console.log(`Account setup complete for ${username}`);
      }
    } catch (error) {
      console.error("Failed to complete setup:", error);
    }
  };

  const handleLoginSuccess = async (uuid: string) => {
    try {
      const username = sessionStorage.getItem("cc_username") || "User";
      sessionStorage.setItem("cc_view", "dashboard");
      setCurrentUser({ username, uuid });
      setCurrentView("dashboard");
    } catch (error) {
      console.error("Failed to complete login:", error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cc_api_token");
    sessionStorage.removeItem("cc_user_uuid");
    sessionStorage.removeItem("cc_username");
    sessionStorage.removeItem("cc_key_type");
    sessionStorage.removeItem("cc_view");
    setCurrentUser(null);
    setCurrentView("landing");
  };

  const handleGoToSettings = () => {
    sessionStorage.setItem("cc_view", "settings");
    setCurrentView("settings");
  };

  const handleBackToDashboard = () => {
    sessionStorage.setItem("cc_view", "dashboard");
    setCurrentView("dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
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
          onCancel={() => setCurrentView("landing")}
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