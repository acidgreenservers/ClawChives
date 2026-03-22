import { Check, Eye, EyeOff, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { AgentKey } from "@/types/agent";

interface GeneratedStepProps {
  generatedKey: AgentKey | null;
  isMasked: boolean;
  onMaskToggle: () => void;
  onCopy: () => void;
  copied: boolean;
}

export function GeneratedStep({ generatedKey, isMasked, onMaskToggle, onCopy, copied }: GeneratedStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">🦞 Lobster Key Spawned!</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          Your new API key is ready. Copy it now; it won't be shown again.
        </p>
      </div>

      <Card className="border-2 border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium text-slate-900 dark:text-slate-50">API Key</Label>
            <button onClick={onMaskToggle} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              {isMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 font-mono text-sm break-all text-red-600 dark:text-slate-100">
              {isMasked ? generatedKey?.apiKey.replace(/./g, "•") : generatedKey?.apiKey}
            </code>
            <Button onClick={onCopy} className="shrink-0" disabled={copied}>
              {copied ? <><Check className="w-4 h-4 mr-2" />Copied</> : <><Copy className="w-4 h-4 mr-2" />Copy</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300 text-sm">Security Notice</h4>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                Store this key securely. Do not share it publicly or commit it to version control.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
