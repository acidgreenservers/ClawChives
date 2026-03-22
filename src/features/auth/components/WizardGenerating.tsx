import { Shield } from "lucide-react";

interface WizardGeneratingProps {
  username: string;
}

export function WizardGenerating({ username }: WizardGeneratingProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
          <Shield className="w-8 h-8 text-amber-600 dark:text-amber-500" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">Generating Identity Key</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Creating secure key for <strong>{username}</strong></p>
      </div>
      <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-6 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-amber-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
        <span className="text-sm font-medium">Generating secure key...</span>
      </div>
    </div>
  );
}
