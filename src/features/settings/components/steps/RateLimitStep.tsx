import { Zap } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Card, CardContent } from "@/shared/ui/card";
import { AgentKeyFormData } from "@/types/agent";

interface RateLimitStepProps {
  formData: AgentKeyFormData;
  onChange: (data: Partial<AgentKeyFormData>) => void;
}

export function RateLimitStep({ formData, onChange }: RateLimitStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium text-slate-900 dark:text-slate-50">Rate Limit (requests per minute)</Label>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Set a limit on how many requests this agent can make per minute. Leave at 0 for unlimited.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1000"
            step="10"
            value={formData.rateLimit}
            onChange={(e) => onChange({ rateLimit: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="w-24 text-right">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formData.rateLimit === 0 ? "∞" : formData.rateLimit}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[0, 60, 300, 1000].map((value) => (
            <button
              key={value}
              onClick={() => onChange({ rateLimit: value })}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                formData.rateLimit === value
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {value === 0 ? "Unlimited" : value}
            </button>
          ))}
        </div>

        {formData.rateLimit > 0 && (
          <Card className="bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <p className="text-sm text-cyan-800 dark:text-cyan-300">
                  Up to <span className="font-semibold">{formData.rateLimit}</span> requests/min. 
                  (~<span className="font-semibold">{Math.round(formData.rateLimit * 60 * 24 / 1000)}K</span> requests/day).
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
