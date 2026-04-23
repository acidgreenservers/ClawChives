import { X, Info } from "lucide-react";
import { Button } from "../button";
import { ModalContainer } from "./ModalContainer";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: "info" | "error";
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = "info",
}: AlertModalProps) {
  if (!isOpen) return null;

  const borderColor =
    variant === "info"
      ? "border-cyan-500/50 dark:border-cyan-500/70"
      : "border-red-500/50 dark:border-red-500/70";

  const headerBorder =
    variant === "info"
      ? "border-cyan-500/30 dark:border-cyan-500/50"
      : "border-red-500/30 dark:border-red-500/50";

  const footerBorder =
    variant === "info"
      ? "border-cyan-500/20 dark:border-cyan-500/30"
      : "border-red-500/20 dark:border-red-500/30";

  const iconBg =
    variant === "info"
      ? "bg-cyan-100 dark:bg-cyan-900/30"
      : "bg-red-100 dark:bg-red-900/30";

  const iconColor =
    variant === "info"
      ? "text-cyan-600 dark:text-cyan-400"
      : "text-red-600 dark:text-red-400";

  const btnColor =
    variant === "info"
      ? "bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20"
      : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20";

  return (
    <ModalContainer borderColor={borderColor}>
      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b ${headerBorder}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Info className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{title}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-6">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
      </div>

      {/* Footer */}
      <div className={`flex p-6 border-t ${footerBorder}`}>
        <Button onClick={(e) => { e.stopPropagation(); onClose(); }} className={`flex-1 ${btnColor}`}>
          Got it 🦞
        </Button>
      </div>
    </ModalContainer>
  );
}
