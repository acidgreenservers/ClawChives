export const BACKDROP = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

export function ModalContainer({
  children,
  borderColor = "border-red-500/50 dark:border-red-500/70",
  maxWidth = "max-w-md",
}: {
  children: React.ReactNode;
  borderColor?: string;
  maxWidth?: string;
}) {
  return (
    <div
      className={BACKDROP}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`bg-white dark:bg-slate-900 border-2 ${borderColor} rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
