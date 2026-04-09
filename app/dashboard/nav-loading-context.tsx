"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import styles from "./shell.module.css";

type NavLoadingPayload = { message: string } | null;

const NavLoadingContext = createContext<
  | {
      setNavLoading: (payload: NavLoadingPayload) => void;
      navLoading: NavLoadingPayload;
    }
  | undefined
>(undefined);

export function NavLoadingProvider({ children }: { children: ReactNode }) {
  const [navLoading, setNavLoading] = useState<NavLoadingPayload>(null);

  const value = useMemo(
    () => ({
      navLoading,
      setNavLoading,
    }),
    [navLoading],
  );

  return <NavLoadingContext.Provider value={value}>{children}</NavLoadingContext.Provider>;
}

/** Permite que uma página (ex.: registro) mostre o carregamento discreto junto à navegação principal. */
export function useNavLoadingSetter() {
  const ctx = useContext(NavLoadingContext);
  if (!ctx) {
    return (_payload: NavLoadingPayload) => {
      /* fora do painel: não faz nada */
    };
  }
  return ctx.setNavLoading;
}

export function DashboardNavLoadingStrip({
  isDark,
  mutedColor,
}: {
  isDark: boolean;
  mutedColor: string;
}) {
  const ctx = useContext(NavLoadingContext);
  if (!ctx?.navLoading) return null;

  const { message } = ctx.navLoading;

  return (
    <div className={styles.navLoadingStrip} aria-live="polite" aria-busy="true">
      <p className={styles.navLoadingMessage} style={{ color: mutedColor }}>
        {message}
      </p>
      <div
        className={styles.navLoadingTrack}
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
        }}
      >
        <div
          className={styles.navLoadingBar}
          style={{
            background: isDark
              ? "linear-gradient(90deg, #2563eb, #38bdf8, #2563eb)"
              : "linear-gradient(90deg, #2563eb, #60a5fa, #2563eb)",
          }}
        />
      </div>
    </div>
  );
}
