import { User, ArrowLeft, Loader2, ArrowRight } from "lucide-react";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

interface WizardProfileProps {
  username: string;
  displayName: string;
  loading: boolean;
  onUsernameChange: (val: string) => void;
  onDisplayNameChange: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function WizardProfile({
  username,
  displayName,
  loading,
  onUsernameChange,
  onDisplayNameChange,
  onBack,
  onNext
}: WizardProfileProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
          <User className="w-8 h-8 text-amber-600 dark:text-amber-500" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-1">Create Your Identity</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Enter your details to generate your secure key</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            type="text"
            placeholder="your-username"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            className="mt-1"
            autoComplete="off"
            maxLength={32}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lowercase letters, numbers, and hyphens only. Max 32 chars.</p>
        </div>

        <div>
          <Label htmlFor="displayName">Display Name (Optional)</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Your Name"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="mt-1"
            maxLength={64}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack} className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!username.trim() || loading}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40 text-white"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
          ) : (
            <>Generate Key <ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
