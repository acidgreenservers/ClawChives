import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InteractiveBrandProps {
  className?: string; // Container classes
  onClick?: () => void;
  showCopyright?: boolean; // Toggle ©™
  showIcon?: boolean; // Toggle Lobster Icon
  iconClassName?: string; // Custom icon sizing/styling
  variant?: 'subtle' | 'prominent'; // Animation profiles
}

export function InteractiveBrand({ 
  className, 
  onClick, 
  showCopyright = true, 
  showIcon = false,
  iconClassName,
  variant = 'subtle'
}: InteractiveBrandProps) {
  const claw = "Claw".split("");
  const chives = "Chives".split("");

  const isProminent = variant === 'prominent';

  const letterVariants = {
    initial: { y: 0 },
    hover: { 
      y: isProminent ? -12 : -3, 
      scale: isProminent ? 1.15 : 1.05,
      transition: { 
        type: "spring" as const, 
        stiffness: 400, 
        damping: 10 
      } 
    }
  };

  return (
    <div 
      className={cn("inline-flex items-center gap-3 cursor-pointer select-none text-lg sm:text-xl", className)}
      onClick={onClick}
    >
      {showIcon && (
        <motion.div 
          className={cn(
            "w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-red-900/20 origin-bottom flex-shrink-0",
            iconClassName
          )}
          variants={letterVariants}
          initial="initial"
          whileHover="hover"
        >
          <span className="text-2xl select-none">🦞</span>
        </motion.div>
      )}
      <div className="flex items-center">
        <span className="flex">
          {claw.map((letter, i) => (
            <motion.span
              key={`claw-${i}`}
              variants={letterVariants}
              initial="initial"
              whileHover="hover"
              className="text-cyan-600 dark:text-cyan-400 inline-block origin-bottom font-bold"
            >
              {letter}
            </motion.span>
          ))}
        </span>
        <span className="flex">
          {chives.map((letter, i) => (
            <motion.span
              key={`chives-${i}`}
              variants={letterVariants}
              initial="initial"
              whileHover="hover"
              className="text-red-500 dark:text-red-400 inline-block origin-bottom font-bold"
            >
              {letter}
            </motion.span>
          ))}
        </span>
        {showCopyright && (
          <span className="text-slate-500 text-[0.6em] font-normal ml-0.5 self-end mb-1 tracking-tighter">©™</span>
        )}
      </div>
    </div>
  );
}
