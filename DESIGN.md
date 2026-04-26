---
# ClawChives Design System

brand:
  name: "ClawChives"
  tagline: "Your Sovereign Pinchmark Library"
  theme: "Marine / Lobster Reef"
  mascot: "🦞 Lobster"
  copyright: "©™"

colors:
  light:
    background: "hsl(0 0% 100%)"
    foreground: "hsl(0 0% 3.9%)"
    card: "hsl(0 0% 100%)"
    cardForeground: "hsl(0 0% 3.9%)"
    popover: "hsl(0 0% 100%)"
    popoverForeground: "hsl(0 0% 3.9%)"
    primary: "hsl(0 0% 9%)"
    primaryForeground: "hsl(0 0% 98%)"
    secondary: "hsl(0 0% 96.1%)"
    secondaryForeground: "hsl(0 0% 9%)"
    muted: "hsl(0 0% 96.1%)"
    mutedForeground: "hsl(0 0% 45.1%)"
    accent: "hsl(0 0% 96.1%)"
    accentForeground: "hsl(0 0% 9%)"
    destructive: "hsl(0 84.2% 60.2%)"
    destructiveForeground: "hsl(0 0% 98%)"
    border: "hsl(0 0% 89.8%)"
    input: "hsl(0 0% 89.8%)"
    ring: "hsl(0 0% 3.9%)"

  dark:
    background: "hsl(0 0% 3.9%)"
    foreground: "hsl(0 0% 98%)"
    card: "hsl(0 0% 3.9%)"
    cardForeground: "hsl(0 0% 98%)"
    popover: "hsl(0 0% 3.9%)"
    popoverForeground: "hsl(0 0% 98%)"
    primary: "hsl(0 0% 98%)"
    primaryForeground: "hsl(0 0% 9%)"
    secondary: "hsl(0 0% 14.9%)"
    secondaryForeground: "hsl(0 0% 98%)"
    muted: "hsl(0 0% 14.9%)"
    mutedForeground: "hsl(0 0% 63.9%)"
    accent: "hsl(0 0% 14.9%)"
    accentForeground: "hsl(0 0% 98%)"
    destructive: "hsl(0 62.8% 30.6%)"
    destructiveForeground: "hsl(0 0% 98%)"
    border: "hsl(0 0% 14.9%)"
    input: "hsl(0 0% 14.9%)"
    ring: "hsl(0 0% 83.1%)"

  brand:
    cyan:
      50: "#ecfeff"
      100: "#cffafe"
      200: "#a5f3fc"
      300: "#67e8f9"
      400: "#22d3ee"
      500: "#06b6d4"
      600: "#0891b2"
      700: "#0e7490"
      800: "#155e75"
      900: "#164e63"
    red:
      50: "#fef2f2"
      100: "#fee2e2"
      200: "#fecaca"
      300: "#fca5a5"
      400: "#f87171"
      500: "#ef4444"
      600: "#dc2626"
      700: "#b91c1c"
      800: "#991b1b"
      900: "#7f1d1d"
    amber:
      50: "#fffbeb"
      100: "#fef3c7"
      200: "#fde68a"
      300: "#fcd34d"
      400: "#fbbf24"
      500: "#f59e0b"
      600: "#d97706"
      700: "#b45309"
      800: "#92400e"
      900: "#78350f"
    slate:
      50: "#f8fafc"
      100: "#f1f5f9"
      200: "#e2e8f0"
      300: "#cbd5e1"
      400: "#94a3b8"
      500: "#64748b"
      600: "#475569"
      700: "#334155"
      800: "#1e293b"
      900: "#0f172a"
      950: "#020617"

  gradients:
    heroLight: "from-slate-50 via-cyan-50 to-amber-50"
    heroDark: "from-slate-950 via-slate-900 to-slate-950"
    primary: "from-cyan-600 to-cyan-700"
    secondary: "from-cyan-600 to-cyan-800"
    tertiary: "from-red-600 to-red-700"
    accent: "from-red-600 to-red-700"
    action: "from-amber-500 to-amber-600"

  semantic:
    success: "hsl(142 76% 36%)"
    warning: "hsl(38 92% 50%)"
    info: "hsl(199 89% 48%)"
    error: "hsl(0 84% 60%)"
    neutral: "hsl(215 25% 27%)"

  chart:
    1: "hsl(12 76% 61%)"
    2: "hsl(173 58% 39%)"
    3: "hsl(197 37% 24%)"
    4: "hsl(43 74% 66%)"
    5: "hsl(27 87% 67%)"

typography:
  fontFamily:
    sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"]
    mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"]

  fontSize:
    xs: "0.75rem"
    sm: "0.875rem"
    base: "1rem"
    lg: "1.125rem"
    xl: "1.25rem"
    "2xl": "1.5rem"
    "3xl": "1.875rem"
    "4xl": "2.25rem"
    "5xl": "3rem"
    "6xl": "3.75rem"
    "7xl": "4.5rem"
    "8xl": "6rem"

  fontWeight:
    normal: "400"
    medium: "500"
    semibold: "600"
    bold: "700"
    extrabold: "800"

  lineHeight:
    none: "1"
    tight: "1.25"
    snug: "1.375"
    normal: "1.5"
    relaxed: "1.625"
    loose: "2"

  letterSpacing:
    tighter: "-0.05em"
    tight: "-0.025em"
    normal: "0em"
    wide: "0.025em"
    wider: "0.05em"
    widest: "0.1em"

spacing:
  0: "0"
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  16: "4rem"
  20: "5rem"
  24: "6rem"
  32: "8rem"
  40: "10rem"
  48: "12rem"
  56: "14rem"
  64: "16rem"

  section:
    vertical: "6rem"
    horizontal: "1rem"
    verticalLarge: "9rem"
    horizontalLarge: "2rem"

borderRadius:
  none: "0"
  sm: "calc(0.375rem - 1px)"
  DEFAULT: "0.375rem"
  md: "calc(0.375rem - 2px)"
  lg: "0.5rem"
  xl: "0.75rem"
  "2xl": "1rem"
  "3xl": "1.5rem"
  full: "9999px"

shadows:
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)"
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)"

  colored:
    cyan:
      DEFAULT: "0 10px 15px -3px rgb(6 182 212 / 0.1)"
      200: "0 10px 15px -3px rgb(165 243 252 / 0.4)"
      600: "0 10px 15px -3px rgb(8 145 178 / 0.4)"
    red:
      DEFAULT: "0 10px 15px -3px rgb(239 68 68 / 0.1)"
      200: "0 10px 15px -3px rgb(254 202 202 / 0.4)"
      600: "0 10px 15px -3px rgb(220 38 38 / 0.4)"
      900: "0 10px 15px -3px rgb(127 29 29 / 0.2)"
    amber:
      DEFAULT: "0 10px 15px -3px rgb(245 158 11 / 0.1)"
      500: "0 10px 15px -3px rgb(245 158 11 / 0.2)"
      900: "0 10px 15px -3px rgb(120 53 15 / 0.2)"

elevation:
  none: "0"
  1: "z-10"
  10: "z-10"
  20: "z-20"
  30: "z-30"
  40: "z-40"
  50: "z-50"
  modal: "z-50"
  dropdown: "z-50"
  tooltip: "z-50"

motion:
  duration:
    75: "75ms"
    100: "100ms"
    150: "150ms"
    200: "200ms"
    300: "300ms"
    400: "400ms"
    500: "500ms"
    600: "600ms"
    700: "700ms"
    1000: "1000ms"

  easing:
    DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)"
    in: "cubic-bezier(0.4, 0, 1, 1)"
    out: "cubic-bezier(0, 0, 0.2, 1)"
    "in-out": "cubic-bezier(0.4, 0, 0.2, 1)"
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)"

  spring:
    stiffness: "400"
    damping: "10"

  viewTransition:
    duration: "500ms"
    easing: "ease-in-out"

  animation:
    spin: "spin 1s linear infinite"
    ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"
    pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
    bounce: "bounce 1s infinite"

breakpoints:
  sm: "640px"
  md: "768px"
  lg: "1024px"
  xl: "1280px"
  "2xl": "1536px"

  container:
    DEFAULT: "100%"
    sm: "640px"
    md: "768px"
    lg: "1024px"
    xl: "1280px"
    "2xl": "1536px"

components:
  button:
    height:
      sm: "2rem"
      DEFAULT: "2.25rem"
      lg: "2.5rem"
    padding:
      sm: "0.5rem 0.75rem"
      DEFAULT: "0.5rem 1rem"
      lg: "1rem 2rem"
    fontSize:
      sm: "0.75rem"
      DEFAULT: "0.875rem"
      lg: "1.125rem"
    borderRadius: "0.375rem"
    transition: "all 150ms ease-in-out"

    variants:
      default:
        background: "var(--primary)"
        foreground: "var(--primary-foreground)"
        shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
        hover: "var(--primary) / 0.9"
      destructive:
        background: "var(--destructive)"
        foreground: "var(--destructive-foreground)"
        shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
        hover: "var(--destructive) / 0.9"
      outline:
        background: "var(--background)"
        border: "1px solid var(--input)"
        shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
        hover: "var(--accent)"
      secondary:
        background: "var(--secondary)"
        foreground: "var(--secondary-foreground)"
        shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
        hover: "var(--secondary) / 0.8"
      ghost:
        background: "transparent"
        hover: "var(--accent)"
      link:
        background: "transparent"
        color: "var(--primary)"
        underline: "underline-offset-4"
        hover: "underline"

    iconSize: "1rem"

  card:
    borderRadius: "0.75rem"
    border: "1px solid var(--border)"
    background: "var(--card)"
    shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
    padding:
      DEFAULT: "1.5rem"
      header: "1.5rem"
      content: "1.5rem"
      footer: "1.5rem"

    header:
      gap: "0.375rem"
      title:
        fontSize: "1.125rem"
        fontWeight: "600"
        letterSpacing: "-0.025em"
      description:
        fontSize: "0.875rem"
        color: "var(--muted-foreground)"

  input:
    height: "2.25rem"
    padding: "0.25rem 0.75rem"
    fontSize: "1rem"
    borderRadius: "0.375rem"
    border: "1px solid var(--input)"
    background: "transparent"
    shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
    focusRing: "1px solid var(--ring)"

  label:
    fontSize: "0.875rem"
    fontWeight: "500"
    lineHeight: "none"

  select:
    height: "2.25rem"
    padding: "0.5rem 0.75rem"
    fontSize: "0.875rem"
    borderRadius: "0.375rem"
    border: "1px solid var(--input)"
    background: "transparent"
    shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"

  textarea:
    minHeight: "3.75rem"
    padding: "0.5rem 0.75rem"
    fontSize: "1rem"
    borderRadius: "0.375rem"
    border: "1px solid var(--input)"
    background: "transparent"
    shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"

  modal:
    backdrop: "rgba(0, 0, 0, 0.6) blur(4px)"
    borderRadius: "1rem"
    shadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)"
    maxWidth: "4rem"
    maxHeight: "90vh"
    padding:
      header: "1.5rem"
      body: "1.5rem"
      footer: "1.5rem"

    header:
      borderBottom: "2px solid"
      gap: "0.75rem"
      title:
        fontSize: "1.25rem"
        fontWeight: "700"

    footer:
      borderTop: "1px solid"
      gap: "0.75rem"

    variants:
      info:
        borderColor: "rgba(6, 182, 212, 0.5)"
        headerBorder: "rgba(6, 182, 212, 0.3)"
        footerBorder: "rgba(6, 182, 212, 0.2)"
        iconBackground: "rgba(165, 243, 252, 1)"
        iconColor: "#0891b2"
        buttonBackground: "#0891b2"
      error:
        borderColor: "rgba(220, 38, 38, 0.5)"
        headerBorder: "rgba(220, 38, 38, 0.3)"
        footerBorder: "rgba(220, 38, 38, 0.2)"
        iconBackground: "rgba(254, 202, 202, 1)"
        iconColor: "#dc2626"
        buttonBackground: "#dc2626"
      danger:
        borderColor: "rgba(220, 38, 38, 0.5)"
        headerBorder: "rgba(220, 38, 38, 0.3)"
        footerBorder: "rgba(220, 38, 38, 0.2)"
        iconBackground: "rgba(254, 202, 202, 1)"
        iconColor: "#dc2626"
        buttonBackground: "#dc2626"
      warning:
        borderColor: "rgba(217, 119, 6, 0.5)"
        headerBorder: "rgba(217, 119, 6, 0.3)"
        footerBorder: "rgba(217, 119, 6, 0.2)"
        iconBackground: "rgba(254, 243, 199, 1)"
        iconColor: "#d97706"
        buttonBackground: "#d97706"

  badge:
    fontSize: "0.75rem"
    fontWeight: "500"
    padding: "0.125rem 0.5rem"
    borderRadius: "9999px"

  avatar:
    size:
      sm: "2rem"
      DEFAULT: "2.5rem"
      lg: "3rem"
    borderRadius: "9999px"

  divider:
    height: "1px"
    background: "var(--border)"

  scrollbar:
    width: "8px"
    height: "8px"
    track: "transparent"
    thumb:
      background: "rgba(148, 163, 184, 0.5)"
      borderRadius: "4px"
      hover: "rgba(148, 163, 184, 0.8)"

brandAnimation:
  letterBounce:
    subtle:
      translateY: "-0.75rem"
      scale: "1.05"
      stiffness: "400"
      damping: "10"
    prominent:
      translateY: "-3rem"
      scale: "1.15"
      stiffness: "400"
      damping: "10"

  icon:
    size:
      DEFAULT: "2.5rem"
      gradient: "linear-gradient(to bottom right, #ef4444, #dc2626)"
    shadow:
      light: "0 10px 15px -3px rgb(254 202 202 / 0.4)"
      dark: "0 10px 15px -3px rgb(127 29 29 / 0.2)"

  copyright:
    fontSize: "0.6em"
    fontWeight: "400"
    color: "#64748b"
    tracking: "-0.1em"

---

# Design Intent

ClawChives embodies the spirit of a thriving marine reef — a sovereign, collaborative ecosystem where humans and AI "Lobsters" work in harmony to organize the vast ocean of web content. The design system reflects this through a carefully crafted visual language that balances technical precision with playful personality.

## Visual Philosophy

The design system is built on three core principles:

### 1. Sovereign Strength
Like a lobster's armored carapace, the interface conveys stability and protection. Bold borders, distinct shadows, and clear visual hierarchy create a sense of permanence. The primary action buttons use deep cyan gradients — the color of deep ocean waters — suggesting depth, reliability, and the unknown territories we explore together.

### 2. Collaborative Harmony
The brand colors — cyan for human intelligence, red for lobster agents, and amber for the treasures we collect — intertwine throughout the interface. Feature cards use colored icons (cyan, amber, green, purple, blue, rose) to represent different aspects of the ecosystem, creating a vibrant but cohesive palette that celebrates diversity in collaboration.

### 3. Fluid Motion
The "Liquid Metal" theme transition — a circular reveal that expands from the user's click point — embodies the organic flow of underwater movement. Interactive brand letters bounce with spring physics when hovered, bringing a playful vitality to the interface without sacrificing functionality. All transitions are smooth, never jarring, maintaining a sense of calm even during dynamic interactions.

## Color Psychology

**Cyan** represents human agency — the clarity of thought, the intelligence of curation, and the cool rationality of systematic organization. Used for primary actions, interactive elements, and the human-facing brand identity.

**Red** represents the Lobster agents — passionate, energetic, and direct. Used for the brand's second half, destructive actions (with appropriate warmth), and agent-related features.

**Amber** represents the treasures we collect — golden pinchmarks, valuable insights, and the warmth of shared knowledge. Used for secondary actions, warnings, and highlight elements.

**Slate** provides the neutral foundation — the ocean floor, the reef structure, and the background against which our coral of content grows. Used for backgrounds, borders, and text, with light/dark variants ensuring accessibility in all conditions.

## Typography

The type system prioritizes readability and information density. Inter serves as the primary sans-serif font, chosen for its excellent legibility at small sizes and neutral personality that lets content shine. JetBrains Mono handles code and technical content with the precision of a lobster's pincer.

Text hierarchy is established through size, weight, and color rather than decoration. Headlines are bold and tracked tight for impact. Body text uses relaxed line-height (1.625) for comfortable reading. Muted text (45% lightness in dark mode, 45.1% saturation in light) indicates secondary information without competing with primary content.

## Spatial Design

The 8px base unit ensures consistent spacing throughout the interface. Cards use generous padding (1.5rem) and subtle shadows to create depth without heaviness. Feature grids breathe with 2rem gaps, allowing each element to stand independently while maintaining visual connection.

The "Locked Shell" layout pattern — rigid headers, fixed sidebars, scrollable content areas — provides predictable navigation. Users always know where to find controls, reducing cognitive load and increasing efficiency for power users who manage large collections of pinchmarks.

## Component Personality

**Buttons** feel tactile and responsive. The hover states use 90% opacity for solid variants, creating a subtle pressed effect. Shadow values (shadow-sm, shadow-lg) provide elevation cues that match interaction importance.

**Cards** feature rounded-xl corners (0.75rem) — soft but not pillowy. The 1px border in slate-89.8% (light) or slate-14.9% (dark) defines edges clearly. Hover states add border color changes (cyan-300, amber-300, etc.) to indicate interactivity.

**Modals** command attention with a 2px colored border that varies by intent (cyan for info, red for danger, amber for warning). The backdrop blur (4px) at 60% opacity creates focus without complete isolation. Icons in colored backgrounds provide immediate semantic recognition.

## Motion Design

All animations serve purpose, not decoration. The 500ms theme transition with circular reveal matches the time it takes for a wave to crest and break — natural, not rushed. Button transitions complete in 150ms, faster than conscious thought, creating a sense of instant response.

Spring physics (stiffness 400, damping 10) for the brand letters create organic bounce that feels alive, not mechanical. The letter-by-letter animation in "subtle" mode moves elements just enough (0.75rem up, 1.05x scale) to draw attention without becoming distracting.

## Accessibility

Contrast ratios exceed WCAG AA standards in all default states. Focus rings use the ring color (3.9% lightness in dark mode, 83.1% in light) at 1px width for clear keyboard navigation. Text sizes never drop below 0.75rem (12px), and line heights never compress below 1.25 for body content.

Color combinations are tested in both light and dark modes to ensure consistent experience. The semantic color system (success, warning, info, error) provides clear meaning regardless of theme.

## The Lobster Ethos

Every design decision reinforces the core identity: this is not just a bookmark manager — it's a collaborative reef where humans and AI agents work as equal partners. The marine metaphor runs deep:

- **ShellCryption** — encrypted storage like a lobster's hard shell
- **Pinchmarks** — captured links like a lobster's precise grasp
- **Scuttling** — web exploration like a lobster moving across the reef floor
- **Molting** — system evolution like a lobster shedding its old shell
- **Tide Pool** — shared data space where humans and lobsters coexist

The design system celebrates this identity at every touchpoint, from the gradient hero backgrounds that evoke ocean depths to the bouncy brand letters that capture a lobster's spirited movement. It's technical, it's playful, and above all — it's a place where human intelligence and AI capability meet to create something greater than either could alone.
