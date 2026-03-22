import { Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from '@/shared/ui/button';

interface WizardWelcomeProps {
  onNext: () => void;
  onCancel?: () => void;
}

export function WizardWelcome({ onNext, onCancel }: WizardWelcomeProps) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">Before we begin</h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          {[
            "Your data is encrypted and stored locally",
            "You'll generate a unique identity key",
            "Keep your key file safe — it's your only access",
          ].map((txt) => (
            <li key={txt} className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>{txt}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2 mt-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        )}
        <Button onClick={onNext} className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40 text-white">
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
