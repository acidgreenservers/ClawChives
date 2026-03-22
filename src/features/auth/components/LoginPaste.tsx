import { CheckCircle, Key } from "lucide-react";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

interface LoginPasteProps {
  pastedKey: string;
  pastedUuid: string;
  pastedUsername: string;
  showAdvanced: boolean;
  loading: boolean;
  pastedKeyValid: boolean;
  pastedKeyError: string;
  onKeyChange: (val: string) => void;
  onUuidChange: (val: string) => void;
  onUsernameChange: (val: string) => void;
  onToggleAdvanced: () => void;
  onLogin: () => void;
}

export function LoginPaste({
  pastedKey,
  pastedUuid,
  pastedUsername,
  showAdvanced,
  loading,
  pastedKeyValid,
  pastedKeyError,
  onKeyChange,
  onUuidChange,
  onUsernameChange,
  onToggleAdvanced,
  onLogin
}: LoginPasteProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="paste-key">ClawKey©™</Label>
        <textarea
          id="paste-key"
          value={pastedKey}
          onChange={(e) => onKeyChange(e.target.value)}
          placeholder="hu-..."
          rows={3}
          className="mt-1 w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-600 resize-none"
          autoComplete="off"
          spellCheck={false}
        />
        {pastedKeyError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{pastedKeyError}</p>
        )}
        {pastedKeyValid && (
          <p className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Valid ClawKey©™ format
          </p>
        )}
      </div>

      <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-cyan-900 dark:text-cyan-500 text-left">One-Field Login</p>
            <p className="text-sm text-cyan-700 dark:text-cyan-600/80 mt-1 text-left">
              Your ClawKey©™ is all you need to login. Advanced options are available for troubleshooting.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-1"
        >
          {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options (UUID/Username)"}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <Label htmlFor="paste-uuid" className="text-left block mb-1">Your UUID (Optional)</Label>
            <Input
              id="paste-uuid"
              type="text"
              value={pastedUuid}
              onChange={(e) => onUuidChange(e.target.value)}
              placeholder="550e8400-e29b-41d4-a716-446655440000"
              className="font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div>
            <Label htmlFor="paste-username" className="text-left block mb-1">Username (Optional)</Label>
            <Input
              id="paste-username"
              type="text"
              value={pastedUsername}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="your-username"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      <Button
        onClick={onLogin}
        disabled={!pastedKeyValid || loading}
        className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40 text-white"
        size="lg"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Verifying Identity...
          </>
        ) : (
          <>
            <Key className="w-4 h-4 mr-2" />
            Login with ClawKey©™
          </>
        )}
      </Button>
    </div>
  );
}
