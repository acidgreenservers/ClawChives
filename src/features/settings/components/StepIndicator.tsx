import { Check } from "lucide-react";
import { Step } from "../hooks/useAgentKeyModal";

interface StepIndicatorProps {
  steps: { id: Step; label: string }[];
  currentStep: Step;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="px-6 py-4 border-b border-red-500/20 dark:border-red-500/30">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isActive
                      ? "bg-amber-500 text-white"
                      : isCompleted
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`text-xs mt-1 ${isActive ? "text-amber-600 dark:text-amber-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-cyan-600" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
