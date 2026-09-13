// components/theme/ThemeToggle.tsx
"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex items-center rounded-full border border-border bg-surface p-1 text-sm font-medium"
    >
      <button
        role="radio"
        aria-checked={theme === "light"}
        onClick={() => setTheme("light")}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
          theme === "light" ? "bg-brand-primary text-white" : "text-text-secondary"
        }`}
      >
        <SunIcon />
        Light Mode
      </button>
      <button
        role="radio"
        aria-checked={theme === "dark"}
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
          theme === "dark" ? "bg-brand-primary text-white" : "text-text-secondary"
        }`}
      >
        <MoonIcon />
        Dark Mode
      </button>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
