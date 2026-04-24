"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY } from "./theme-constants";

type Theme = "light" | "dark";

export { THEME_STORAGE_KEY } from "./theme-constants";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Mantido para páginas de auth; também persiste no localStorage */
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isTheme(v: string | null): v is Theme {
  return v === "light" || v === "dark";
}

function readThemeFromStorage(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(v)) return v;
  } catch {
    /* ignore */
  }
  return "light";
}

function writeThemeToStorage(t: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useLayoutEffect(() => {
    setThemeState(readThemeFromStorage());
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    writeThemeToStorage(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const n = current === "dark" ? "light" : "dark";
      writeThemeToStorage(n);
      return n;
    });
  }, []);

  const isDark = theme === "dark";

  const pageBackground = isDark
    ? "radial-gradient(circle at top right, rgba(15,23,42,0.85), #020617)"
    : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)";

  const pageBackgroundColor = isDark ? "#020617" : "#f8fafc";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const { body } = document;
    body.style.margin = "0";
    body.style.backgroundImage = pageBackground;
    body.style.backgroundColor = pageBackgroundColor;
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundAttachment = "fixed";
    body.style.backgroundSize = "cover";
    if (document.documentElement) {
      document.documentElement.setAttribute("data-handhorse-theme", theme);
    }
  }, [pageBackground, pageBackgroundColor, theme]);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    toggleTheme,
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
