import { useState } from "react";
import { Button } from '@/shared/ui/button';
import { AlertTriangle, RefreshCw } from "lucide-react";
import { resetDatabase } from "@/services/database";

export function DatabaseReset() {
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetDatabase();
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset database:", error);
      setIsResetting(false);
    }
  };

  return (
    <div className="border border-red-300 bg-red-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-600 dark:text-red-400">Reset Database</h4>
          <p className="text-sm text-red-700 mt-1">
            This will delete all your bookmarks, folders, tags, and settings. 
            This action cannot be undone.
          </p>
          
          {!showConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              className="mt-3 bg-red-600 hover:bg-red-700"
              onClick={() => setShowConfirm(true)}
            >
              Reset Database
            </Button>
          ) : (
            <div className="flex gap-2 mt-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Confirm Reset"
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={isResetting}
                className="border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}