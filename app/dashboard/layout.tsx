"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import {
  LayoutDashboard,
  HeartPulse,
  Bell,
  Wallet,
  GitBranch,
  Trophy,
  Sun,
  Moon,
  LogOut,
  User,
  Building2,
  ChevronDown,
} from "lucide-react";
import { IconHorse } from "@tabler/icons-react";
import { useTheme } from "@/shared/ui/theme-context";
import { clearAuthTokens } from "@/shared/infrastructure/auth/token-storage";
import {
  DashboardNavLoadingStrip,
  NavLoadingProvider,
} from "./nav-loading-context";
import { userAvatarInitials } from "@/shared/application/name-initials";
import { DashboardSessionProvider, useDashboardSession } from "./session-context";
import styles from "./shell.module.css";

// Wrapper to map Lucide-style strokeWidth → Tabler stroke prop
function HorseNavIcon({ size, strokeWidth }: { size?: number; strokeWidth?: number }) {
  return <IconHorse size={size} stroke={strokeWidth} />;
}

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { href: "/dashboard/registry", icon: HorseNavIcon, label: "Cavalos" },
  { href: "/dashboard/health", icon: HeartPulse, label: "Saúde" },
  { href: "/dashboard/reminders", icon: Bell, label: "Compromissos" },
  { href: "/dashboard/awards", icon: Trophy, label: "Premiações" },
  { href: "/dashboard/finances", icon: Wallet, label: "Financeiro" },
  { href: "/dashboard/genealogy", icon: GitBranch, label: "Árvore" },
] as const;

function ProfileMenu({ isDark }: { isDark: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { session } = useDashboardSession();
  const muted = isDark ? "#9CA3AF" : "#64748b";
  const text = isDark ? "#E5E7EB" : "#0f172a";
  /** Superfície opaca (sem glass) para o menu de perfil */
  const menuSurface: CSSProperties = {
    background: isDark ? "#1a1f2e" : "#ffffff",
    border: `1px solid ${isDark ? "#2d3548" : "#e2e8f0"}`,
    boxShadow: isDark ? "0 8px 28px rgba(0,0,0,0.45)" : "0 8px 28px rgba(15,23,42,0.1)",
  };

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  function handleLogout() {
    clearAuthTokens();
    router.push("/auth/login");
  }

  const avatarUrl = session?.profilePhotoUrl;
  const initials = userAvatarInitials(session?.user?.name, session?.user?.email);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          ...menuSurface,
          padding: "6px 10px 6px 6px",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: "10px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #3b82f6, #10b981)",
            color: "#fff",
            fontWeight: 800,
            fontSize: initials.length > 1 ? "0.68rem" : "0.85rem",
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" width={32} height={32} style={{ objectFit: "cover" }} />
          ) : (
            initials
          )}
        </span>
        <ChevronDown size={16} color={muted} style={{ flexShrink: 0 }} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: "200px",
            ...menuSurface,
            borderRadius: "16px",
            padding: "8px",
            zIndex: 200,
            boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 20px 50px rgba(15,23,42,0.14)",
          }}
        >
          <Link
            href="/dashboard/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "12px",
              color: text,
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            <User size={18} color="#3b82f6" aria-hidden />
            Meus dados
          </Link>
          <Link
            href="/dashboard/haras"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "12px",
              color: text,
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            <Building2 size={18} color="#10b981" aria-hidden />
            Meu Haras
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "10px 12px",
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#ef4444",
              fontSize: "0.9rem",
              fontWeight: 600,
              fontFamily: "inherit",
              textAlign: "left",
            }}
          >
            <LogOut size={18} aria-hidden />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const isDark = theme === "dark";

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

            <ProfileMenu isDark={isDark} />
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className={styles.main} style={{ color: textColor }}>
        {children}
      </main>

      {/* ── Navegação (sidebar em desktop) + loading no rodapé do ecrã em desktop ── */}
      <div className={styles.chromeDock}>
        <footer className={styles.navZone} aria-label="Navegação principal">
          <nav className={styles.nav} aria-label="Secções">
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
        </footer>
        <div className={styles.screenFooterLoading}>
          <DashboardNavLoadingStrip isDark={isDark} mutedColor={mutedColor} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NavLoadingProvider>
      <DashboardSessionProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </DashboardSessionProvider>
    </NavLoadingProvider>
  );
}
