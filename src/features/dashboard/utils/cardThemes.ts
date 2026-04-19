/**
 * cardThemes.ts
 * "Lobsterized" subtle tints for Pinchmark cards.
 */

export interface CardTheme {
  bg: string;
  border: string;
  hover: string;
  text: string;
  badge: string;
  accent: string;
}

const themes: CardTheme[] = [
  // Lobster Red (Subtle Tint)
  {
    bg: "bg-rose-50/50 dark:bg-rose-950/10",
    border: "border-rose-100 dark:border-rose-900/30",
    hover: "hover:border-rose-300 dark:hover:border-rose-700",
    text: "text-rose-900 dark:text-rose-100",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    accent: "text-rose-600 dark:text-rose-400"
  },
  // Claw Cyan (Subtle Tint)
  {
    bg: "bg-cyan-50/50 dark:bg-cyan-950/10",
    border: "border-cyan-100 dark:border-cyan-900/30",
    hover: "hover:border-cyan-300 dark:hover:border-cyan-700",
    text: "text-cyan-900 dark:text-cyan-100",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    accent: "text-cyan-600 dark:text-cyan-400"
  },
  // Amber Amber (Subtle Tint)
  {
    bg: "bg-amber-50/50 dark:bg-amber-950/10",
    border: "border-amber-100 dark:border-amber-900/30",
    hover: "hover:border-amber-300 dark:hover:border-amber-700",
    text: "text-amber-900 dark:text-amber-100",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    accent: "text-amber-600 dark:text-amber-400"
  }
];

export function getCardTheme(id: string): CardTheme {
  if (!id) return themes[1]; // Default to cyan
  
  // Simple deterministic hash
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return themes[Math.abs(hash) % themes.length];
}
