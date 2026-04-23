import { X, AlertTriangle } from "lucide-react";
import { Button } from "../button";
import { ModalContainer } from "./ModalContainer";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmBtn =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
      : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20";

  const headerBorder =
    variant === "danger"
      ? "border-red-500/30 dark:border-red-500/50"
      : "border-amber-500/30 dark:border-amber-500/50";

  const footerBorder =
    variant === "danger"
      ? "border-red-500/20 dark:border-red-500/30"
      : "border-amber-500/20 dark:border-amber-500/30";

  const containerBorder =
    variant === "danger"
      ? "border-red-500/50 dark:border-red-500/70"
      : "border-amber-500/50 dark:border-amber-500/70";

  const iconBg =
    variant === "danger"
      ? "bg-red-100 dark:bg-red-900/30"
      : "bg-amber-100 dark:bg-amber-900/30";

  const iconColor =
    variant === "danger"
      ? "text-red-600 dark:text-red-400"
      : "text-amber-600 dark:text-amber-400";

  return (
    <ModalContainer borderColor={containerBorder}>
      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b ${headerBorder}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
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
      <div className={`flex gap-3 p-6 border-t ${footerBorder}`}>
        <Button
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="flex-1 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); onConfirm(); onClose(); }}
          className={`flex-1 ${confirmBtn}`}
        >
          {confirmLabel}
        </Button>
      </div>
    </ModalContainer>
  );
}
