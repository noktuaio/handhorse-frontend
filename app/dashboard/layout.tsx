"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, type CSSProperties } from "react";
import {
  LayoutDashboard,
  HeartPulse,
  Wallet,
  GitBranch,
  Sparkles,
  Trophy,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { IconHorse } from "@tabler/icons-react";
import { useTheme } from "@/shared/ui/theme-context";
import { clearAuthTokens } from "@/shared/infrastructure/auth/token-storage";
import {
  DashboardNavLoadingStrip,
  NavLoadingProvider,
} from "./nav-loading-context";
import styles from "./shell.module.css";

// Wrapper to map Lucide-style strokeWidth → Tabler stroke prop
function HorseNavIcon({ size, strokeWidth }: { size?: number; strokeWidth?: number }) {
  return <IconHorse size={size} stroke={strokeWidth} />;
}

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { href: "/dashboard/registry", icon: HorseNavIcon, label: "Cavalos" },
  { href: "/dashboard/health", icon: HeartPulse, label: "Saúde" },
  { href: "/dashboard/awards", icon: Trophy, label: "Premiações" },
  { href: "/dashboard/finances", icon: Wallet, label: "Financeiro" },
  { href: "/dashboard/genealogy", icon: GitBranch, label: "Árvore" },
  { href: "/dashboard/ai", icon: Sparkles, label: "IA" },
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const isDark = theme === "dark";

  function handleLogout() {
    clearAuthTokens();
    router.push("/auth/login");
  }

  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: isDark
      ? "0 4px 32px rgba(0,0,0,0.5)"
      : "0 4px 32px rgba(15,23,42,0.08)",
  };

  const textColor = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#6B7280" : "#94a3b8";

  return (
    <NavLoadingProvider>
    <div className={styles.root}>
      {/* ── Top Header ── */}
      <header className={styles.header}>
        <div
          style={{
            ...glass,
            borderRadius: "2rem",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Image src="/logo-handhorse.png" alt="HandHorse" width={34} height={34} />
            <span
              style={{
                fontWeight: 900,
                fontSize: "1.05rem",
                letterSpacing: "-0.02em",
                background: "linear-gradient(90deg, #3b82f6, #10b981)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              HandHorse
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Alternar tema claro/escuro"
              style={{
                ...glass,
                padding: "9px",
                borderRadius: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isDark ? (
                <Sun size={18} color="#FACC15" />
              ) : (
                <Moon size={18} color="#1F2937" />
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair"
              title="Sair"
              style={{
                ...glass,
                padding: "9px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
              }}
            >
              <LogOut size={18} color="#ef4444" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className={styles.main} style={{ color: textColor }}>
        {children}
      </main>

      {/* ── Loading discreto + navegação principal ── */}
      <div className={styles.navZone}>
        <DashboardNavLoadingStrip isDark={isDark} mutedColor={mutedColor} />
        <nav className={styles.nav} aria-label="Navegação principal">
          <div className={styles.navPill} style={glass}>
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  title={label}
                  style={{
                    padding: "12px",
                    borderRadius: "22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    transition: "background 0.2s, box-shadow 0.2s",
                    backgroundColor: isActive ? "#2563eb" : "transparent",
                    color: isActive ? "#fff" : mutedColor,
                    boxShadow: isActive ? "0 4px 16px rgba(37,99,235,0.4)" : "none",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
    </NavLoadingProvider>
  );
}
