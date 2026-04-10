"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  const isDark = theme === "dark";

  const pageBackground = isDark
    ? "radial-gradient(circle at top right, rgba(15,23,42,0.85), #020617)"
    : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)";

  const pageBackgroundColor = isDark ? "#020617" : "#f8fafc";

  useEffect(() => {
    const { body } = document;
    body.style.margin = "0";
    body.style.backgroundImage = pageBackground;
    body.style.backgroundColor = pageBackgroundColor;
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundAttachment = "fixed";
    body.style.backgroundSize = "cover";
  }, [pageBackground, pageBackgroundColor]);

  const value: ThemeContextValue = {
    theme,
    toggleTheme: () => {
      setTheme((current) => (current === "dark" ? "light" : "dark"));
    },
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
